"""
FastAPI application — StudyMate AI Service v2.

All 4 learning outputs (summary, flashcards, quiz, Q&A) are generated
in parallel via asyncio.gather.  SSE streaming is supported for Q&A.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)

from core.config import config
from core.logging import correlation_id_var, get_logger
from models.requests import (
    AnkiExportRequest,
    DiagnosticRequest,
    GenerateRequest,
    RagQueryRequest,
    RagUploadRequest,
    StudyPlanRequest,
)
from models.responses import (
    ChunkResponse,
    DiagnosticResponse,
    FlashcardExportResponse,
    FlashcardResponse,
    GenerateResponse,
    HealthResponse,
    QuizItemResponse,
    RagQueryResponse,
    StudyPlanResponse,
)
from services import (
    flashcard_service,
    llm_service,
    quiz_service,
    rag_service,
    study_plan_service,
)
from utils.prompt_builder import build_prompt

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------
REQUEST_COUNT = Counter(
    "ai_service_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "ai_service_request_duration_seconds",
    "HTTP request latency",
    ["endpoint"],
)
LLM_CALLS = Counter("ai_service_llm_calls_total", "Groq API calls made")


# ---------------------------------------------------------------------------
# Lifespan: warm up heavy models at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("StudyMate AI Service v2 starting up")
    try:
        rag_service.get_embedding_fn()
        rag_service.get_reranker()
        logger.info("Embedding models loaded successfully")
    except Exception as exc:
        logger.warning("Model warmup skipped: %s", exc)
    yield
    logger.info("StudyMate AI Service v2 shutting down")


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="StudyMate AI Service",
    description="AI-powered study assistant — summaries, flashcards, quizzes, RAG Q&A",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_middleware(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    correlation_id_var.set(cid)
    start = time.perf_counter()
    logger.info(
        "→ %s %s",
        request.method,
        request.url.path,
        extra={"correlation_id": cid},
    )
    response = await call_next(request)
    duration = time.perf_counter() - start
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code,
    ).inc()
    REQUEST_LATENCY.labels(endpoint=request.url.path).observe(duration)
    response.headers["X-Correlation-ID"] = cid
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    logger.info("← %s %.3fs", response.status_code, duration)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    cid = correlation_id_var.get()
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "correlation_id": cid, "type": "internal_error"},
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health():
    svcs: dict[str, str] = {}
    try:
        rag_service.get_chroma_client().heartbeat()
        svcs["chromadb"] = "ok"
    except Exception:
        svcs["chromadb"] = "unavailable"
    return HealthResponse(status="ok", services=svcs)


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/api/v1/generate", response_model=GenerateResponse)
async def generate_all(req: GenerateRequest):
    """
    Generate summary + flashcards + quiz + Q&A in parallel.
    If mode=pdf and pdf_collection is set, retrieves RAG context first.
    """
    context: str | None = req.context
    retrieved: list[ChunkResponse] = []

    if req.mode == "pdf" and req.pdf_collection:
        chunks = rag_service.query_chunks(req.topic, req.pdf_collection, top_k=5)
        if chunks:
            context = "\n\n".join(c["text"] for c in chunks)
            retrieved = [ChunkResponse(**c) for c in chunks]

    summary_task = (
        f"Create a comprehensive, student-friendly study summary about: {req.topic}\n\n"
        f"Format Requirements:\n"
        f"• Use bullet points for key concepts.\n"
        f"• Difficulty level: {req.difficulty}.\n"
        f"• Keep it clear, educational, and well-structured.\n"
        f"• CRITICAL: You must format the layout with double newlines (\\n\\n) between paragraphs, headings, and list items. Never place a heading immediately after text without a blank line."
    )
    qa_task = (
        f"Answer this student question clearly and concisely: {req.topic}\n\n"
        f"Provide a complete answer with examples where helpful.\n"
        f"• CRITICAL: Format the layout with double newlines (\\n\\n) between paragraphs, headings, and bullet points."
    )

    strict = req.mode == "pdf"
    summary_prompt = build_prompt(summary_task, context, strict=strict)
    qa_prompt = build_prompt(qa_task, context, strict=strict)

    # Run generations sequentially as requested
    summary_result = await llm_service.generate(summary_prompt)
    qa_result = await llm_service.generate(qa_prompt)
    flashcards_result = await flashcard_service.generate_flashcards(req.topic, req.num_flashcards, context, req.mode)
    quiz_result = await quiz_service.generate_quiz(
        req.topic,
        count=req.question_count,
        difficulty=req.difficulty,
        question_type=req.question_type,
        context=context,
        mode=req.mode,
    )
    LLM_CALLS.inc(4)

    return GenerateResponse(
        summary=summary_result,
        flashcards=[FlashcardResponse(**c) for c in flashcards_result],
        quiz=[QuizItemResponse(**q) for q in quiz_result],
        answer=qa_result,
        retrieved_chunks=retrieved,
    )


@app.post("/api/v1/rag/upload")
async def rag_upload(req: RagUploadRequest):
    try:
        pdf_bytes = base64.b64decode(req.pdf_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 PDF data")
    ids = rag_service.index_pdf(pdf_bytes, req.collection_name)
    return {"message": "PDF indexed", "chunks_indexed": len(ids), "collection": req.collection_name}


@app.post("/api/v1/rag/query", response_model=RagQueryResponse)
async def rag_query(req: RagQueryRequest):
    if not req.collection_name:
        return RagQueryResponse(chunks=[])
    chunks = rag_service.query_chunks(req.query, req.collection_name, req.top_k)
    return RagQueryResponse(chunks=[ChunkResponse(**c) for c in chunks])


@app.post("/api/v1/rag/ask/stream")
async def rag_ask_stream(req: RagQueryRequest):
    """SSE streaming Q&A — uses PDF context when collection is provided, else general knowledge."""
    context = None
    strict = False

    if req.collection_name and req.mode == "pdf":
        chunks = rag_service.query_chunks(req.query, req.collection_name, req.top_k)
        if chunks:
            context = "\n\n".join(c["text"] for c in chunks)
            strict = True

    prompt = build_prompt(f"Answer this question clearly and helpfully: {req.query}", context, strict=strict)

    async def event_gen() -> AsyncGenerator[str, None]:
        try:
            async for token in llm_service.generate_stream(prompt):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: [ERROR] {exc}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@app.post("/api/v1/flashcards/export/anki", response_model=FlashcardExportResponse)
async def export_anki(req: AnkiExportRequest):
    apkg = flashcard_service.export_anki(req.deck_name, req.cards)
    return FlashcardExportResponse(
        apkg_base64=base64.b64encode(apkg).decode(),
        filename=req.deck_name.replace(" ", "_") + ".apkg",
    )


@app.post("/api/v1/quiz/generate")
async def quiz_generate(req: GenerateRequest):
    context: str | None = None
    if req.mode == "pdf" and req.pdf_collection:
        chunks = rag_service.query_chunks(req.topic, req.pdf_collection, top_k=5)
        if chunks:
            context = "\n\n".join(c["text"] for c in chunks)
    quiz = await quiz_service.generate_quiz(
        req.topic,
        count=req.question_count,
        difficulty=req.difficulty,
        question_type=req.question_type,
        context=context,
        mode=req.mode,
    )
    return {"quiz": quiz, "count": len(quiz)}


@app.post("/api/v1/study-plan/generate", response_model=StudyPlanResponse)
async def study_plan_generate(req: StudyPlanRequest):
    data = await study_plan_service.generate_plan(
        req.exam_date,
        req.topics,
        req.hours_per_day,
        req.mastery_levels,
        req.pdf_collection,
    )
    return StudyPlanResponse(**data)

@app.post("/api/v1/study-plan/diagnostic", response_model=DiagnosticResponse)
async def study_plan_diagnostic(req: DiagnosticRequest):
    data = await study_plan_service.generate_diagnostic(req.topics, req.pdf_collection)
    return DiagnosticResponse(**data)
