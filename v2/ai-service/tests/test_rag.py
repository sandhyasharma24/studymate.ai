"""Tests for chunking and RAG utilities."""
import pytest
from unittest.mock import MagicMock, patch

from utils.chunking import split_text
from services.rag_service import _rrf


class TestChunking:
    def test_basic_split(self):
        text = " ".join(["word"] * 500)
        chunks = split_text(text, chunk_size=400, overlap=60)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk.split()) <= 400

    def test_overlap_shared_words(self):
        words = [f"w{i}" for i in range(800)]
        text = " ".join(words)
        chunks = split_text(text, chunk_size=400, overlap=60)
        assert len(chunks) > 1
        last_of_first = set(chunks[0].split()[-60:])
        first_of_second = set(chunks[1].split()[:60])
        assert len(last_of_first & first_of_second) > 0

    def test_empty_returns_empty(self):
        assert split_text("") == []
        assert split_text("   ") == []

    def test_short_text_single_chunk(self):
        chunks = split_text("hello world", chunk_size=400, overlap=60)
        assert chunks == ["hello world"]

    def test_exact_boundary(self):
        text = " ".join(["x"] * 400)
        chunks = split_text(text, chunk_size=400, overlap=0)
        assert len(chunks) == 1

    def test_no_empty_chunks(self):
        text = " ".join(["word"] * 1200)
        chunks = split_text(text, chunk_size=400, overlap=60)
        assert all(c.strip() for c in chunks)


class TestRRF:
    def test_score_order(self):
        rankings = [["a", "b", "c"]]
        scores = _rrf(rankings)
        assert scores["a"] > scores["b"] > scores["c"]

    def test_merged_ranking(self):
        r1 = ["a", "b", "c"]
        r2 = ["b", "c", "a"]
        scores = _rrf([r1, r2])
        # b appears 2nd in r1 and 1st in r2 → should beat a
        assert scores["b"] > scores["a"]

    def test_empty(self):
        assert _rrf([]) == {}

    def test_single_item(self):
        scores = _rrf([["only"]])
        assert "only" in scores


class TestRagService:
    @patch("services.rag_service.get_chroma_client")
    def test_missing_collection_returns_empty(self, mock_client):
        mock_client.return_value.get_collection.side_effect = Exception("not found")
        from services.rag_service import query_chunks
        result = query_chunks("test query", "nonexistent_col")
        assert result == []

    @patch("services.rag_service.get_chroma_client")
    def test_empty_collection_returns_empty(self, mock_client):
        mock_col = MagicMock()
        mock_col.count.return_value = 0
        mock_client.return_value.get_collection.return_value = mock_col
        from services.rag_service import query_chunks
        result = query_chunks("test", "empty_col")
        assert result == []
