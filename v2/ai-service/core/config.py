from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # LLM
    groq_api_key: str = ""
    hf_token: str = ""
    model_name: str = "llama-3.1-8b-instant"

    # Embeddings
    embedding_model: str = "all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # ChromaDB
    chroma_host: str = "chromadb"
    chroma_port: int = 8000

    # Redis
    redis_url: str = "redis://redis:6379"

    # Chunking
    chunk_size: int = 400
    chunk_overlap: int = 60
    top_k_retrieval: int = 5

    # Cache
    cache_ttl: int = 3600

    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]


@lru_cache()
def get_settings() -> Settings:
    return Settings()


config = get_settings()
