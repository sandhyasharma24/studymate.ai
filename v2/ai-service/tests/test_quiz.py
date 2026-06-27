"""Tests for Quiz Service."""
import pytest
from unittest.mock import MagicMock, patch

from services.quiz_service import generate_quiz


class TestQuizService:
    @patch("services.llm_service.generate")
    def test_generate_quiz_mcq(self, mock_generate):
        mock_generate.return_value = """
        Question: What is 2+2?
        A) 3
        B) 4
        C) 5
        D) 6
        Answer: B
        """
        
        quiz = generate_quiz("math", count=1, difficulty="easy", q_type="mcq")
        assert len(quiz) == 1
        assert quiz[0]["question"] == "What is 2+2?"
        assert "B) 4" in quiz[0]["options"]
        assert quiz[0]["answer"] == "B"
        assert quiz[0]["type"] == "mcq"
        assert quiz[0]["difficulty"] == "easy"
