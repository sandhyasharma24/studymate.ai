from backend.services.llm_service import (
    generate
)

from backend.utils.prompt_builder import (
    build_prompt
)


def generate_quiz(
    topic,
    context=None,
    mode="general"
):

    quiz_prompt = f"""
Generate EXACTLY 2 MCQ questions about {topic}.

STRICT FORMAT:

Question: ...
A) ...
B) ...
C) ...
D) ...
Answer: A
"""

    quiz_raw = generate(
        build_prompt(
            quiz_prompt,
            context,
            strict_context=(
                mode == "pdf"
            )
        )
    )

    quiz = []

    blocks = quiz_raw.split(
        "Question:"
    )

    for block in blocks[1:]:

        lines = [
            l.strip()
            for l in block.split("\n")
            if l.strip()
        ]

        if len(lines) >= 6:

            quiz.append({
                "question": lines[0],
                "options": lines[1:5],
                "answer": (
                    lines[5]
                    .split(":")[-1]
                    .strip()
                )
            })

    return quiz