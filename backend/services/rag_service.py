from sentence_transformers import SentenceTransformer
from fastapi import HTTPException
from pypdf import PdfReader
from io import BytesIO

import numpy as np
import faiss

from backend.utils.chunking import (
    split_text_into_chunks
)

# ---------- EMBEDDING MODEL ----------

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

# ---------- GLOBAL STORAGE ----------

rag_index = None

rag_chunks = []


# ---------- PDF INDEXING ----------

def upload_and_index_pdf(pdf_bytes):

    global rag_index, rag_chunks

    reader = PdfReader(
        BytesIO(pdf_bytes)
    )

    extracted_text = "\n".join(
        (
            page.extract_text() or ""
        )
        for page in reader.pages
    )

    chunks = split_text_into_chunks(
        extracted_text
    )

    if not chunks:

        raise HTTPException(
            status_code=400,
            detail="No readable text found in PDF."
        )

    embeddings = embedding_model.encode(
        chunks,
        convert_to_numpy=True
    )

    embeddings = np.asarray(
        embeddings,
        dtype=np.float32
    )

    rag_index = faiss.IndexFlatL2(
        embeddings.shape[1]
    )

    rag_index.add(embeddings)

    rag_chunks = chunks

    return len(rag_chunks)


# ---------- RETRIEVAL ----------

def retrieve_relevant_chunks(
    query,
    top_k=5
):

    global rag_index, rag_chunks

    if rag_index is None or not rag_chunks:

        raise HTTPException(
            status_code=400,
            detail="Please upload and index a PDF first."
        )

    query_embedding = embedding_model.encode(
        [query],
        convert_to_numpy=True
    )

    query_embedding = np.asarray(
        query_embedding,
        dtype=np.float32
    )

    k = min(
        top_k,
        len(rag_chunks)
    )

    _, indices = rag_index.search(
        query_embedding,
        k
    )

    retrieved = [
        rag_chunks[idx]
        for idx in indices[0]
        if 0 <= idx < len(rag_chunks)
    ]

    return retrieved