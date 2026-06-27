"""
Output parsers for structured LLM responses.
Handles flashcards (Q:/A: format), MCQ, True/False, and Fill-in-the-blank.
"""
import re
from typing import Any


def parse_flashcards(text: str) -> list[dict[str, str]]:
    """
    Parse Q: ... / A: ... formatted LLM output into structured dicts.

    Handles case-insensitive prefixes and skips malformed entries.
    """
    parsed: list[dict[str, str]] = []
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    temp_q: str | None = None

    for line in lines:
        upper = line.upper()
        if upper.startswith("Q:"):
            temp_q = line[2:].strip()
        elif upper.startswith("A:") and temp_q is not None:
            answer = line[2:].strip()
            if temp_q and answer:
                parsed.append({"question": temp_q, "answer": answer})
            temp_q = None

    return parsed


def parse_quiz(text: str) -> list[dict[str, Any]]:
    """
    Parse MCQ formatted LLM output.

    Expected format per question:
        Question: <text>
        A) <option>
        B) <option>
        C) <option>
        D) <option>
        Answer: <letter>
    """
    quiz: list[dict[str, Any]] = []
    blocks = re.split(r"(?i)Question:", text)

    for block in blocks[1:]:
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        if len(lines) < 3:
            continue

        question = lines[0]
        options: list[str] = []
        answer = ""

        explanation = ""

        for line in lines[1:]:
            if re.match(r"^[A-Da-d][).]", line):
                options.append(line)
            elif re.match(r"(?i)^answer\s*:", line):
                raw = re.split(r":", line, 1)[-1].strip()
                answer = raw.upper()[:1]
            elif re.match(r"(?i)^explanation\s*:", line):
                explanation = re.split(r":", line, 1)[-1].strip()

        if question and options and answer:
            quiz.append({
                "question": question, 
                "options": options, 
                "answer": answer,
                "explanation": explanation
            })

    return quiz


def parse_true_false(text: str) -> list[dict[str, Any]]:
    """
    Parse True/False formatted LLM output.

    Expected format:
        Question: <statement>
        Answer: True | False
    """
    questions: list[dict[str, Any]] = []
    blocks = re.split(r"(?i)Question:", text)

    for block in blocks[1:]:
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        if len(lines) < 2:
            continue

        question = lines[0]
        answer = ""
        explanation = ""

        for line in lines[1:]:
            if re.match(r"(?i)^answer\s*:", line):
                raw = re.split(r":", line, 1)[-1].strip().lower()
                answer = "True" if "true" in raw else "False"
            elif re.match(r"(?i)^explanation\s*:", line):
                explanation = re.split(r":", line, 1)[-1].strip()

        if question and answer:
            questions.append({
                "question": question,
                "options": ["True", "False"],
                "answer": answer,
                "explanation": explanation
            })

    return questions


def parse_fill_blank(text: str) -> list[dict[str, Any]]:
    """
    Parse fill-in-the-blank formatted LLM output.

    Expected format:
        Question: <sentence with _____ for blank>
        Answer: <correct word/phrase>
    """
    questions: list[dict[str, Any]] = []
    blocks = re.split(r"(?i)Question:", text)

    for block in blocks[1:]:
        lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
        if len(lines) < 2:
            continue

        question = lines[0]
        answer = ""
        explanation = ""

        for line in lines[1:]:
            if re.match(r"(?i)^answer\s*:", line):
                answer = re.split(r":", line, 1)[-1].strip()
            elif re.match(r"(?i)^explanation\s*:", line):
                explanation = re.split(r":", line, 1)[-1].strip()

        if question and answer:
            questions.append({
                "question": question, 
                "answer": answer, 
                "options": [],
                "explanation": explanation
            })

    return questions
