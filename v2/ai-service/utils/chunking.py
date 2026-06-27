"""
Word-level text chunker with configurable overlap.
Upgraded from the original character-level split in rag_service.py.
"""


def split_text(
    text: str,
    chunk_size: int = 400,
    overlap: int = 60,
) -> list[str]:
    """
    Split *text* into word-level chunks of at most *chunk_size* words,
    with *overlap* words shared between consecutive chunks.

    Args:
        text: Raw input text to chunk.
        chunk_size: Maximum number of words per chunk.
        overlap: Number of words to repeat at the start of each new chunk
                 to preserve context continuity across boundaries.

    Returns:
        List of non-empty chunk strings.
    """
    if not text or not text.strip():
        return []

    words = text.split()
    if not words:
        return []

    # Step is how far we advance the window each iteration
    step = max(chunk_size - overlap, 1)
    chunks: list[str] = []

    for start in range(0, len(words), step):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break

    return chunks
