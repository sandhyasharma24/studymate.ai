from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)

from backend.models.request_model import (
    TopicRequest,
    RagQueryRequest
)

from backend.services.llm_service import (
    generate
)

from backend.services.rag_service import (
    upload_and_index_pdf,
    retrieve_relevant_chunks
)

from backend.services.flashcard_service import (
    generate_flashcards
)

from backend.services.quiz_service import (
    generate_quiz
)

from backend.utils.prompt_builder import (
    build_prompt
)

app = FastAPI()


# ---------- MAIN GENERATION ----------

@app.post("/generate")
def generate_content(data: TopicRequest):

    topic = data.topic.strip()

    mode = (
        data.mode or "general"
    ).lower()

    context = None

    retrieved_chunks = []

    # ---------- PDF MODE ----------

    if mode == "pdf":

        retrieved_chunks = (
            retrieve_relevant_chunks(
                topic,
                top_k=5
            )
        )

        context = "\n\n".join(
            retrieved_chunks
        )

    # ---------- SUMMARY ----------

    summary = generate(

        build_prompt(

            f"""
Create a student-friendly summary about:

{topic}

Use bullet points where useful.
Keep explanation educational and easy to understand.
""",

            context,

            strict_context=(
                mode == "pdf"
            )
        )
    )

    # ---------- FLASHCARDS ----------

    flashcards = generate_flashcards(

        topic,

        data.num_flashcards,

        context,

        mode
    )

    # ---------- QUIZ ----------

    quiz = generate_quiz(

        topic,

        context,

        mode
    )

    # ---------- QA ----------

    qa_answer = generate(

        build_prompt(

            f"""
Answer this student question clearly and concisely.

Question:
{topic}
""",

            context,

            strict_context=(
                mode == "pdf"
            )
        )
    )

    return {

        "summary": summary,

        "flashcards": flashcards,

        "quiz": quiz,

        "answer": qa_answer,

        "retrieved_chunks": retrieved_chunks
    }


# ---------- PDF UPLOAD ----------

@app.post("/rag/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    if not file.filename.lower().endswith(
        ".pdf"
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    pdf_bytes = await file.read()

    chunk_count = upload_and_index_pdf(
        pdf_bytes
    )

    return {
        "message":
            "PDF indexed successfully.",

        "chunks_indexed":
            chunk_count
    }


# ---------- OPTIONAL DIRECT RAG QA ----------

@app.post("/rag/ask")
def ask_rag(data: RagQueryRequest):

    retrieved_chunks = (
        retrieve_relevant_chunks(
            data.question,
            top_k=5
        )
    )

    context = "\n\n".join(
        retrieved_chunks
    )

    answer = generate(

        build_prompt(

            data.question,

            context,

            strict_context=True
        )
    )

    return {

        "answer": answer,

        "retrieved_chunks":
            retrieved_chunks
    }


# ---------- HEALTH CHECK ----------

@app.get("/")
def home():

    return {
        "message":
            "StudyMate AI backend running 🚀"
    }