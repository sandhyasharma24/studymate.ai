"""
Flashcard generation service with:
- SM-2 spaced repetition metadata on every card
- Deduplication loop (up to 4 retries)
- Anki .apkg export via genanki
"""
from __future__ import annotations

import logging
import os
import random
import tempfile
from datetime import date, timedelta
from typing import Optional

import genanki

from services.llm_service import generate
from utils.parsers import parse_flashcards
from utils.prompt_builder import build_prompt

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Anki model (static ID ensures updates don't create duplicate card types)
# ---------------------------------------------------------------------------
_ANKI_MODEL = genanki.Model(
    1607392319,
    "StudyMate Card",
    fields=[{"name": "Question"}, {"name": "Answer"}],
    templates=[{
        "name": "Card 1",
        "qfmt": '<div class="q">{{Question}}</div>',
        "afmt": '{{FrontSide}}<hr id="answer"><div class="a">{{Answer}}</div>',
    }],
    css=(
        ".card{font-family:'Inter',sans-serif;font-size:20px;text-align:center;padding:20px;}"
        ".q{color:#8B5CF6;font-weight:700;margin-bottom:12px;}"
        ".a{color:#06B6D4;}"
    ),
)


# ---------------------------------------------------------------------------
# SM-2 defaults
# ---------------------------------------------------------------------------

def _sm2_defaults() -> dict:
    return {
        "interval": 1,
        "repetition_count": 0,
        "ease_factor": 2.5,
        "next_review_date": (date.today() + timedelta(days=1)).isoformat(),
        "last_review_date": None,
        "status": "new",
    }


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

def _flashcard_prompt(topic: str, count: int, existing: list[str]) -> str:
    avoid = ""
    if existing:
        avoid = "\n\nDo NOT repeat these questions:\n" + "\n".join(f"- {q}" for q in existing)
    return (
        f"Generate EXACTLY {count} unique flashcards about: {topic}\n\n"
        "STRICT FORMAT (one card per pair, no numbering):\n"
        "Q: <question>\n"
        "A: <answer>\n"
        f"{avoid}"
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_flashcards(
    topic: str,
    num_flashcards: int,
    context: Optional[str] = None,
    mode: str = "general",
) -> list[dict]:
    """
    Generate *num_flashcards* unique flashcards about *topic*.
    Each card dict includes SM-2 scheduling fields.
    """
    cards: list[dict] = []
    seen: set[str] = set()
    max_attempts = 4

    for attempt in range(max_attempts):
        remaining = num_flashcards - len(cards)
        if remaining <= 0:
            break

        task = _flashcard_prompt(topic, remaining, [c["question"] for c in cards])
        prompt = build_prompt(task, context, strict=(mode == "pdf"))

        try:
            raw = await generate(prompt)
            parsed = parse_flashcards(raw)
            for card in parsed:
                normalised = card["question"].strip().lower()
                if normalised not in seen:
                    seen.add(normalised)
                    cards.append({**card, **_sm2_defaults()})
                if len(cards) >= num_flashcards:
                    break
        except Exception as exc:
            logger.error("Flashcard generation attempt %d failed: %s", attempt + 1, exc)

    return cards[:num_flashcards]


def export_anki(deck_name: str, cards: list[dict]) -> bytes:
    """
    Convert a list of {question, answer} dicts to an Anki .apkg file.
    Returns raw bytes of the package.
    """
    deck_id = random.randrange(1 << 30, 1 << 31)
    deck = genanki.Deck(deck_id, deck_name)

    for card in cards:
        note = genanki.Note(
            model=_ANKI_MODEL,
            fields=[
                str(card.get("question", "")),
                str(card.get("answer", "")),
            ],
        )
        deck.add_note(note)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".apkg") as tmp:
        tmp_path = tmp.name

    try:
        genanki.Package(deck).write_to_file(tmp_path)
        with open(tmp_path, "rb") as fh:
            return fh.read()
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
