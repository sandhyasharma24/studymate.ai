"""Tests for LLM Service."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

from services.llm_service import generate, generate_batch


class TestLLMService:
    @patch("services.llm_service.cache_get")
    @patch("services.llm_service.cache_set")
    @patch("services.llm_service.get_client")
    @pytest.mark.asyncio
    async def test_generate_cache_hit(self, mock_get_client, mock_cache_set, mock_cache_get):
        # Mock cache hit
        mock_cache_get.return_value = "Cached Response"
        
        response = await generate("Test Prompt", use_cache=True)
        assert response == "Cached Response"
        mock_get_client.assert_not_called()

    @patch("services.llm_service.cache_get")
    @patch("services.llm_service.cache_set")
    @patch("services.llm_service.get_client")
    @pytest.mark.asyncio
    async def test_generate_cache_miss(self, mock_get_client, mock_cache_set, mock_cache_get):
        mock_cache_get.return_value = None
        
        # Mock AsyncGroq client
        mock_client = MagicMock()
        mock_chat = AsyncMock()
        mock_completion = MagicMock()
        mock_choice = MagicMock()
        mock_message = MagicMock()
        
        mock_message.content = "LLM Response"
        mock_choice.message = mock_message
        mock_completion.choices = [mock_choice]
        mock_chat.create.return_value = mock_completion
        mock_client.chat.completions = mock_chat
        mock_get_client.return_value = mock_client
        
        response = await generate("Test Prompt", use_cache=True)
        assert response == "LLM Response"
        mock_cache_set.assert_called_once()
