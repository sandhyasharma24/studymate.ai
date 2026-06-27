"""
Quiz generation service.
Supports configurable count (1-10), difficulty (easy/medium/hard),
and question types (mcq, true_false, fill_blank).
"""
from __future__ import annotations

import logging
from typing import Any, Literal, Optional

from services.llm_service import generate
from utils.parsers import parse_fill_blank, parse_quiz, parse_true_false
from utils.prompt_builder import build_prompt

logger = logging.getLogger(__name__)

_DIFFICULTY_HINTS: dict[str, str] = {
    "easy": "Use simple, straightforward questions that test basic recall and recognition.",
    "medium": "Use moderately challenging questions that test comprehension and application.",
    "hard": "Use complex questions that require analysis, synthesis, critical thinking, and evaluation.",
}

_TYPE_FORMAT: dict[str, str] = {
    "mcq": (
        "Question: <question text>\n"
        "A) <option>\nB) <option>\nC) <option>\nD) <option>\n"
        "Answer: <correct letter A/B/C/D>\n"
        "Explanation: <brief explanation of the correct choice and why others are incorrect>"
    ),
    "true_false": (
        "Question: <statement>\n"
        "Answer: True or False\n"
        "Explanation: <brief explanation of why the statement is true or false>"
    ),
    "fill_blank": (
        "Question: <sentence with _____ for the blank>\n"
        "Answer: <correct word or phrase>\n"
        "Explanation: <brief explanation of the answer context>"
    ),
}


async def generate_quiz(
    topic: str,
    count: int = 3,
    difficulty: Literal["easy", "medium", "hard"] = "medium",
    question_type: Literal["mcq", "true_false", "fill_blank"] = "mcq",
    context: Optional[str] = None,
    mode: str = "general",
) -> list[dict[str, Any]]:
    """
    Generate *count* questions about *topic* at the specified *difficulty*.
    Returns a list of structured question dicts.
    """
    type_label = question_type.replace("_", " ")
    fmt = _TYPE_FORMAT[question_type]
    hint = _DIFFICULTY_HINTS[difficulty]

    task = (
        f"Generate EXACTLY {count} {type_label} questions about: {topic}\n\n"
        f"Difficulty: {difficulty.upper()}\n"
        f"{hint}\n\n"
        f"STRICT FORMAT for every question (repeat {count} times):\n{fmt}\n\n"
        "Do not add extra commentary, numbering, or blank lines between fields."
    )

    prompt = build_prompt(task, context, strict=(mode == "pdf"))

    try:
        raw = await generate(prompt)
    except Exception as exc:
        logger.error("Quiz generation failed: %s", exc)
        return []

    if question_type == "mcq":
        parsed = parse_quiz(raw)
    elif question_type == "true_false":
        parsed = parse_true_false(raw)
    else:
        parsed = parse_fill_blank(raw)

    return [
        {**item, "difficulty": difficulty, "type": question_type}
        for item in parsed[:count]
    ]
