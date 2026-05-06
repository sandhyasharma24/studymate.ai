def split_text_into_chunks(
    text,
    chunk_size_words=400,
    overlap_words=60
):

    words = text.split()

    if not words:
        return []

    chunks = []

    step = max(
        chunk_size_words - overlap_words,
        1
    )

    for start in range(
        0,
        len(words),
        step
    ):

        end = min(
            start + chunk_size_words,
            len(words)
        )

        chunk = " ".join(
            words[start:end]
        ).strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(words):
            break

    return chunks