"""
Async LLM service wrapping the Groq API.

Features:
- Async client (groq.AsyncGroq)
- Redis prompt caching (1-hour TTL, keyed on SHA-256 of prompt)
- Tenacity retry: 3 attempts, exponential backoff 2-10s
- Streaming via AsyncGenerator
- Batch parallel generation via asyncio.gather
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
from typing import AsyncGenerator, Optional

from groq import AsyncGroq
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from core.config import config
from core.logging import get_logger
from services.cache_service import cache_get, cache_set

logger = get_logger(__name__)

_client: Optional[AsyncGroq] = None


def _get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=config.groq_api_key)
    return _client


def _cache_key(prompt: str) -> str:
    return "llm:v2:" + hashlib.sha256(prompt.encode()).hexdigest()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def generate(prompt: str, use_cache: bool = True) -> str:
    """
    Generate a single completion.
    Checks Redis cache first; on miss, calls Groq and stores the result.
    """
    key = _cache_key(prompt)

    if use_cache:
        cached = await cache_get(key)
        if cached is not None:
            logger.info("LLM cache hit")
            return str(cached)

    client = _get_client()
    response = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=config.model_name,
        temperature=0.7,
        max_tokens=2048,
    )
    result: str = response.choices[0].message.content.strip()

    if use_cache:
        await cache_set(key, result, ttl=config.cache_ttl)

    return result


async def generate_batch(prompts: list[str]) -> list[str]:
    """
    Fire all prompts in parallel and return results in the same order.
    Individual failures return an error string so the batch always completes.
    """
    tasks = [generate(p) for p in prompts]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    output: list[str] = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            logger.error("Batch LLM call %d failed: %s", i, res)
            output.append(f"[Generation error: {res}]")
        else:
            output.append(str(res))
    return output


async def generate_stream(prompt: str) -> AsyncGenerator[str, None]:
    """
    Stream tokens from the LLM as they arrive.
    Yields raw content delta strings.
    """
    client = _get_client()
    stream = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=config.model_name,
        temperature=0.7,
        max_tokens=2048,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
