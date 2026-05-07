from pypdf import PdfReader

from sklearn.feature_extraction.text import (
    TfidfVectorizer
)

from sklearn.metrics.pairwise import (
    cosine_similarity
)

import tempfile

# ---------- GLOBAL STORAGE ----------

stored_chunks = []

vectorizer = TfidfVectorizer()

chunk_vectors = None

# ---------- TEXT SPLITTER ----------

def split_text(
    text,
    chunk_size=500
):

    chunks = []

    for i in range(
        0,
        len(text),
        chunk_size
    ):

        chunks.append(
            text[i:i + chunk_size]
        )

    return chunks

# ---------- PDF INDEXING ----------

def upload_and_index_pdf(
    pdf_bytes
):

    global stored_chunks
    global chunk_vectors

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as tmp_file:

        tmp_file.write(pdf_bytes)

        pdf_path = tmp_file.name

    reader = PdfReader(
        pdf_path
    )

    text = ""

    for page in reader.pages:

        extracted = (
            page.extract_text()
        )

        if extracted:

            text += (
                extracted + "\n"
            )

    stored_chunks = split_text(
        text
    )

    chunk_vectors = (
        vectorizer.fit_transform(
            stored_chunks
        )
    )

    return len(stored_chunks)

# ---------- RETRIEVAL ----------

def retrieve_relevant_chunks(
    query,
    top_k=5
):

    global chunk_vectors

    if (
        not stored_chunks
        or chunk_vectors is None
    ):

        return []

    query_vector = (
        vectorizer.transform(
            [query]
        )
    )

    similarities = (
        cosine_similarity(
            query_vector,
            chunk_vectors
        )[0]
    )

    top_indices = (
        similarities.argsort()[
            -top_k:
        ][::-1]
    )

    return [

        stored_chunks[i]

        for i in top_indices
    ]