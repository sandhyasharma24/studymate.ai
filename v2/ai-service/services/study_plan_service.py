"""
Study plan generation service with diagnostic assessment and dynamic timeline.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, timedelta
from typing import Any

from services import llm_service, rag_service, quiz_service

logger = logging.getLogger(__name__)

async def validate_topics(topics: list[str]) -> list[str]:
    """
    Use LLM to evaluate topics and filter out garbage.
    """
    try:
        prompt = f"""You are an educational AI. Review this list of study topics: {topics}.
Your task is to aggressively filter out any topics that are garbage, typos, or meaningless single letters (e.g., 'a', 'v', 'b', 'x', 'asdf').
Only keep identifiable, valid academic, technical, or general knowledge subjects (e.g., 'ai', 'machine learning', 'python', 'C++', 'history').
If a topic is just a single letter like 'a', DROP IT unless it's a known programming language like 'C' or 'R'.
Return ONLY a JSON list of strings representing the validated topics. No explanations.
Example input: ['a', 'ml', 'asdf'] -> Example output: ["ml"]"""
        res = await llm_service.generate(prompt)
        
        match = re.search(r"\[.*?\]", res, re.DOTALL)
        if match:
            valid_topics = json.loads(match.group(0))
            return [str(t) for t in valid_topics]
    except Exception as exc:
        logger.warning(f"Failed to validate topics: {exc}")
    
    # Fallback to original if parsing fails
    return topics

async def clarify_topic(topic: str) -> str:
    """
    For ambiguous short topic names (like 'C', 'R', 'Python'), ask the LLM
    to infer the likely academic/technical subject so quiz questions are relevant.
    """
    prompt = (
        f"Given the following study topic: \"{topic}\"\n"
        "Infer the most likely academic or technical subject this refers to "
        "(e.g. 'C' → 'C programming language', 'R' → 'R programming language', "
        "'Python' → 'Python programming language', 'ML' → 'Machine Learning').\n"
        "Return ONLY the clarified topic name as a single line of text. No explanation."
    )
    try:
        clarified = await llm_service.generate(prompt)
        return clarified.strip().strip('"').strip("'")
    except Exception:
        return topic


async def generate_diagnostic(topics: list[str], pdf_collection: str | None = None) -> dict[str, Any]:
    """
    Validates topics and generates a 10-question diagnostic quiz.
    Questions are generated per-topic using clarified topic names so 'C' → 'C programming language'.
    The `topic` field stored on each question uses the original validated topic name for mastery tracking.
    """
    valid_topics = await validate_topics(topics)
    if not valid_topics:
        valid_topics = ["General Knowledge"]
    
    quiz = []
    questions_per_topic = max(1, 10 // len(valid_topics))
    
    for t in valid_topics:
        # Clarify ambiguous topics so the LLM generates correct-domain questions
        clarified = await clarify_topic(t)
        
        context = None
        if pdf_collection:
            chunks = rag_service.query_chunks(clarified, pdf_collection, top_k=5)
            if chunks:
                context = "\n\n".join(c["text"] for c in chunks)
                
        topic_quiz = await quiz_service.generate_quiz(
            clarified,  # Use clarified name for generation
            count=questions_per_topic,
            difficulty="medium",
            question_type="mcq",
            context=context,
            mode="pdf" if pdf_collection else "general"
        )
        for q in topic_quiz:
            q["topic"] = t  # Tag with ORIGINAL name for mastery tracking
            quiz.append(q)
    
    return {
        "validated_topics": valid_topics,
        "quiz": quiz
    }

async def generate_plan(
    exam_date: date,
    topics: list[str],
    hours_per_day: float,
    mastery_levels: dict[str, float],
    pdf_collection: str | None = None,
) -> dict[str, Any]:
    """
    Return a day-by-day study schedule using diagnostic mastery levels.
    """
    logger.info(f"Generating study plan: topics={topics}, hours_per_day={hours_per_day}, mastery_levels={mastery_levels}")
    
    today = date.today()
    days_until_exam = max((exam_date - today).days, 1)

    # Normalize mastery levels keys to lowercase to be case-insensitive
    normalized_mastery = {k.lower().strip(): float(v) for k, v in mastery_levels.items() if v is not None}
    
    # Use actual mastery from diagnostic, default to 0.5
    actual_mastery = {t: normalized_mastery.get(t.lower().strip(), 0.5) for t in topics}
    logger.info(f"Resolved actual mastery: {actual_mastery}")

    # Use exponential weighting: weight = (1.0 - mastery)^2
    # This creates a massive time distribution difference between high and low mastery topics!
    # Floor at 0.05 to ensure high mastery still gets at least a tiny bit of time
    weights = {t: max((1.0 - actual_mastery[t]) ** 2, 0.05) for t in topics}
    total_weight = sum(weights.values())
    
    if total_weight > 0:
        proportions = {t: w / total_weight for t, w in weights.items()}
    else:
        proportions = {t: 1.0 / len(topics) for t in topics}
        
    logger.info(f"Topic weights: {weights}, proportions: {proportions}")
    daily_allocation = {t: round(p * hours_per_day, 1) for t, p in proportions.items()}
    logger.info(f"Daily allocations: {daily_allocation}")

    plan: dict[str, list[dict[str, Any]]] = {}
    exam_week_start = days_until_exam - 7

    # Track progression of activities per topic
    topic_activity_index = {t: 0 for t in topics}

    for day_offset in range(days_until_exam):
        day_str = (today + timedelta(days=day_offset)).isoformat()
        day_acts: list[dict[str, Any]] = []
        is_exam_week = day_offset >= exam_week_start

        for topic in topics:
            hrs = daily_allocation.get(topic, 0.0)
            if hrs < 0.05:
                continue

            mastery = actual_mastery.get(topic, 0.5)
            idx = topic_activity_index[topic]

            if is_exam_week:
                activity = "review" if idx % 2 == 0 else "quiz"
            else:
                if mastery < 0.4:
                    # Low mastery: Heavy study
                    cycle = ["study", "study", "study", "review", "quiz"]
                elif mastery < 0.7:
                    # Med mastery: Balanced
                    cycle = ["study", "review", "quiz"]
                else:
                    # High mastery: Heavy review/quiz
                    cycle = ["review", "quiz", "quiz"]
                
                activity = cycle[idx % len(cycle)]

            topic_activity_index[topic] += 1
            day_acts.append({"topic": topic, "hours": hrs, "activity_type": activity})

        if day_acts:
            plan[day_str] = day_acts

    total_hours = round(
        sum(act["hours"] for acts in plan.values() for act in acts), 1
    )

    return {
        "plan": plan,
        "total_days": days_until_exam,
        "total_hours": total_hours,
        "exam_date": exam_date.isoformat(),
        "topic_allocation": daily_allocation,
        "assessed_mastery": actual_mastery,
    }
