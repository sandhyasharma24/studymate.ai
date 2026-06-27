"""Tests for Flashcard Service."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import date

from services.flashcard_service import generate_flashcards, export_anki


class TestFlashcardService:
    @patch("services.llm_service.generate")
    def test_generate_flashcards_basic(self, mock_generate):
        # Mock LLM response
        mock_generate.return_value = "Q: What is Python?\nA: A programming language.\nQ: What is FastAPI?\nA: A web framework."
        
        cards = generate_flashcards("programming", count=2)
        assert len(cards) == 2
        assert cards[0]["question"] == "What is Python?"
        assert cards[0]["answer"] == "A programming language."
        assert cards[0]["interval"] == 1
        assert cards[0]["ease_factor"] == 2.5
        assert cards[0]["status"] == "new"

    @patch("genanki.Deck")
    @patch("genanki.Package")
    def test_export_anki(self, mock_package, mock_deck):
        cards = [
            {"question": "Q1", "answer": "A1"},
            {"question": "Q2", "answer": "A2"}
        ]
        
        apkg_base64, filename = export_anki("Test Deck", cards)
        assert apkg_base64 is not None
        assert filename == "test_deck.apkg"
