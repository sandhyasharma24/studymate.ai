"""
Pydantic v2 request models with full validation.
"""
from __future__ import annotations

import base64
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=1000, description="Topic or question to generate content for")
    num_flashcards: int = Field(default=5, ge=1, le=20)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    mode: Literal["general", "pdf"] = "general"
    pdf_collection: Optional[str] = Field(default=None, max_length=255)
    context: Optional[str] = None
    question_count: int = Field(default=3, ge=1, le=10)
    question_type: Literal["mcq", "true_false", "fill_blank"] = "mcq"


class RagUploadRequest(BaseModel):
    collection_name: str = Field(..., min_length=1, max_length=255)
    pdf_base64: str

    @field_validator("pdf_base64")
    @classmethod
    def validate_base64(cls, v: str) -> str:
        try:
            base64.b64decode(v, validate=True)
        except Exception:
            raise ValueError("pdf_base64 must be valid base64-encoded data")
        return v


class RagQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    collection_name: Optional[str] = Field(default=None, max_length=255)
    top_k: int = Field(default=5, ge=1, le=20)
    mode: Optional[str] = Field(default="general")


class FlashcardReviewRequest(BaseModel):
    card_id: str
    quality: int = Field(..., ge=0, le=5, description="SM-2 quality rating 0-5")


class AnswerItem(BaseModel):
    question_id: str
    selected_option: str


class QuizSubmitRequest(BaseModel):
    answers: list[AnswerItem]


class StudyPlanRequest(BaseModel):
    exam_date: date
    topics: list[str] = Field(..., min_length=1, description="List of topics to study")
    pdf_collection: Optional[str] = Field(default=None, description="Optional ChromaDB collection for mastery assessment")
    hours_per_day: int = Field(..., ge=1, le=12)
    mastery_levels: dict[str, float] = Field(
        default_factory=dict,
        description="Topic -> mastery level 0.0 (none) to 1.0 (expert)"
    )

    @field_validator("mastery_levels")
    @classmethod
    def validate_mastery(cls, v: dict[str, float]) -> dict[str, float]:
        for topic, level in v.items():
            if not 0.0 <= level <= 1.0:
                raise ValueError(f"Mastery level for '{topic}' must be between 0.0 and 1.0")
        return v


class AnkiExportRequest(BaseModel):
    deck_name: str = Field(..., min_length=1, max_length=255)
    cards: list[dict]

class DiagnosticRequest(BaseModel):
    topics: list[str] = Field(..., min_length=1, description="List of topics to evaluate")
    pdf_collection: Optional[str] = Field(default=None)
