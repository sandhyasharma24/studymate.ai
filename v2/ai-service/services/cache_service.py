"""
Redis-based async cache service.
All failures are soft — cache misses never break the main flow.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from core.config import config

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None  # type: ignore[type-arg]


async def _get_client() -> aioredis.Redis:  # type: ignore[type-arg]
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            config.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=3,
        )
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    """Return cached value or None on miss / error."""
    try:
        client = await _get_client()
        value = await client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as exc:
        logger.warning("Cache GET failed for key=%s: %s", key, exc)
        return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> bool:
    """Store *value* in Redis with *ttl* seconds expiry. Returns True on success."""
    try:
        client = await _get_client()
        await client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as exc:
        logger.warning("Cache SET failed for key=%s: %s", key, exc)
        return False


async def cache_delete(key: str) -> bool:
    """Delete a key. Returns True on success."""
    try:
        client = await _get_client()
        await client.delete(key)
        return True
    except Exception as exc:
        logger.warning("Cache DELETE failed for key=%s: %s", key, exc)
        return False


async def close_redis() -> None:
    """Graceful shutdown — call on app teardown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
