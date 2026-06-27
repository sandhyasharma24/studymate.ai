"""
RAG service — ChromaDB + sentence-transformers + BM25 + cross-encoder reranker.

Pipeline per query:
  1. Dense retrieval  → ChromaDB cosine similarity (top_k * 3 candidates)
  2. Sparse retrieval → BM25Okapi keyword scoring (top_k * 3 candidates)
  3. Fusion           → Reciprocal Rank Fusion (RRF, k=60)
  4. Reranking        → cross-encoder/ms-marco-MiniLM-L-6-v2 → return top_k
"""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Optional

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
from pypdf import PdfReader
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder

from core.config import config
from core.logging import get_logger
from utils.chunking import split_text

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Singletons (lazy-initialised for fast cold-start)
# ---------------------------------------------------------------------------
_chroma_client: Optional[chromadb.HttpClient] = None
_embedding_fn: Optional[SentenceTransformerEmbeddingFunction] = None
_reranker: Optional[CrossEncoder] = None


def get_chroma_client() -> chromadb.HttpClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.HttpClient(
            host=config.chroma_host,
            port=config.chroma_port,
        )
    return _chroma_client


def get_embedding_fn() -> SentenceTransformerEmbeddingFunction:
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = SentenceTransformerEmbeddingFunction(
            model_name=config.embedding_model,
        )
    return _embedding_fn


def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder(config.reranker_model)
    return _reranker


# ---------------------------------------------------------------------------
# PDF helpers
# ---------------------------------------------------------------------------

def _extract_pages(pdf_bytes: bytes) -> list[tuple[int, str]]:
    """Return [(page_number, page_text), ...] from raw PDF bytes."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = tmp.name
    try:
        reader = PdfReader(tmp_path)
        pages: list[tuple[int, str]] = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages.append((i + 1, text))
        return pages
    finally:
        os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Indexing
# ---------------------------------------------------------------------------

def index_pdf(pdf_bytes: bytes, collection_name: str) -> list[str]:
    """
    Parse *pdf_bytes*, chunk it, embed, and upsert into ChromaDB.

    Returns the list of chunk IDs inserted.
    """
    client = get_chroma_client()
    emb_fn = get_embedding_fn()

    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=emb_fn,
        metadata={"hnsw:space": "cosine"},
    )

    pages = _extract_pages(pdf_bytes)
    all_ids: list[str] = []
    all_docs: list[str] = []
    all_meta: list[dict[str, Any]] = []
    chunk_idx = 0

    for page_num, page_text in pages:
        for chunk in split_text(page_text, config.chunk_size, config.chunk_overlap):
            chunk_id = f"{collection_name}_c{chunk_idx}"
            all_ids.append(chunk_id)
            all_docs.append(chunk)
            all_meta.append({
                "page_number": page_num,
                "chunk_index": chunk_idx,
                "source": "pdf",
                "collection": collection_name,
            })
            chunk_idx += 1

    if not all_ids:
        logger.warning("No text extracted from PDF for collection=%s", collection_name)
        return []

    # Upsert in batches of 100 to avoid memory spikes
    BATCH = 100
    for i in range(0, len(all_ids), BATCH):
        collection.upsert(
            ids=all_ids[i : i + BATCH],
            documents=all_docs[i : i + BATCH],
            metadatas=all_meta[i : i + BATCH],
        )

    logger.info("Indexed %d chunks into collection=%s", len(all_ids), collection_name)
    return all_ids


# ---------------------------------------------------------------------------
# Hybrid retrieval helpers
# ---------------------------------------------------------------------------

def _rrf(rankings: list[list[str]], k: int = 60) -> dict[str, float]:
    """Reciprocal Rank Fusion — merge ranked lists into a score dict."""
    scores: dict[str, float] = {}
    for ranked in rankings:
        for rank, doc_id in enumerate(ranked):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)
    return scores


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

def query_chunks(
    query: str,
    collection_name: str,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Hybrid search: dense + BM25 → RRF → cross-encoder reranker.

    Returns list of dicts: [{text, metadata, score}, ...]
    """
    client = get_chroma_client()
    emb_fn = get_embedding_fn()
    candidate_k = top_k * 3

    # --- 1. Dense retrieval ---
    try:
        col = client.get_collection(name=collection_name, embedding_function=emb_fn)
    except Exception:
        logger.warning("Collection not found: %s", collection_name)
        return []

    col_count = col.count()
    if col_count == 0:
        return []

    n_results = min(candidate_k, col_count)
    dense_res = col.query(query_texts=[query], n_results=n_results)
    dense_ids: list[str] = dense_res["ids"][0] if dense_res["ids"] else []
    dense_docs: list[str] = dense_res["documents"][0] if dense_res["documents"] else []
    dense_meta: list[dict] = dense_res["metadatas"][0] if dense_res["metadatas"] else []

    if not dense_ids:
        return []

    # Build a lookup map: id -> {text, metadata}
    doc_map: dict[str, dict[str, Any]] = {
        doc_id: {"text": doc, "metadata": meta}
        for doc_id, doc, meta in zip(dense_ids, dense_docs, dense_meta)
    }

    # --- 2. Sparse retrieval (BM25) ---
    corpus = [doc_map[did]["text"].lower().split() for did in dense_ids]
    bm25 = BM25Okapi(corpus)
    bm25_scores = bm25.get_scores(query.lower().split())
    bm25_ranked = [
        dense_ids[i]
        for i in sorted(range(len(bm25_scores)), key=lambda x: bm25_scores[x], reverse=True)
    ][:candidate_k]

    # --- 3. RRF fusion ---
    rrf_scores = _rrf([dense_ids, bm25_ranked])
    merged_ids = sorted(rrf_scores, key=lambda x: rrf_scores[x], reverse=True)[:candidate_k]
    merged_docs = [doc_map[did]["text"] for did in merged_ids if did in doc_map]
    merged_meta = [doc_map[did]["metadata"] for did in merged_ids if did in doc_map]

    if not merged_docs:
        return []

    # --- 4. Cross-encoder reranking ---
    try:
        reranker = get_reranker()
        pairs = [(query, doc) for doc in merged_docs]
        rerank_scores: list[float] = reranker.predict(pairs).tolist()
        ranked_idx = sorted(range(len(rerank_scores)), key=lambda i: rerank_scores[i], reverse=True)
        return [
            {
                "text": merged_docs[i],
                "metadata": merged_meta[i] if i < len(merged_meta) else {},
                "score": float(rerank_scores[i]),
            }
            for i in ranked_idx[:top_k]
        ]
    except Exception as exc:
        logger.error("Reranker failed, falling back to RRF order: %s", exc)
        return [
            {
                "text": doc_map[did]["text"],
                "metadata": doc_map[did]["metadata"],
                "score": rrf_scores.get(did, 0.0),
            }
            for did in merged_ids[:top_k]
            if did in doc_map
        ]
