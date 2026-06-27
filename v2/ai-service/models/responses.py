"""
Pydantic v2 response models — typed API contracts.
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class FlashcardResponse(BaseModel):
    question: str
    answer: str
    interval: int = 1
    repetition_count: int = 0
    ease_factor: float = 2.5
    next_review_date: str
    last_review_date: Optional[str] = None
    status: str = "new"


class QuizItemResponse(BaseModel):
    question: str
    options: list[str]
    answer: str
    difficulty: str
    type: str
    topic: Optional[str] = None


class ChunkResponse(BaseModel):
    text: str
    metadata: dict[str, Any]
    score: float


class GenerateResponse(BaseModel):
    summary: str
    flashcards: list[FlashcardResponse]
    quiz: list[QuizItemResponse]
    answer: str
    retrieved_chunks: list[ChunkResponse] = []


class RagQueryResponse(BaseModel):
    chunks: list[ChunkResponse]


class FlashcardExportResponse(BaseModel):
    apkg_base64: str
    filename: str


class StudyDayActivity(BaseModel):
    topic: str
    hours: float
    activity_type: str  # "study" | "review" | "quiz"


class StudyPlanResponse(BaseModel):
    plan: dict[str, list[StudyDayActivity]]
    total_days: int
    total_hours: float
    exam_date: str


class HealthResponse(BaseModel):
    status: str
    version: str = "2.0.0"
    services: dict[str, str] = {}

class DiagnosticResponse(BaseModel):
    validated_topics: list[str]
    quiz: list[QuizItemResponse]
