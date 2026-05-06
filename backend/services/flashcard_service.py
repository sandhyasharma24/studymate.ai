from backend.services.llm_service import (
    generate
)

from backend.utils.prompt_builder import (
    build_prompt
)

from backend.utils.parsers import (
    parse_flashcards
)


def build_flashcard_prompt(
    topic,
    count,
    existing_questions=None
):

    existing_questions = (
        existing_questions or []
    )

    avoid_section = ""

    if existing_questions:

        joined_questions = "\n".join(
            f"- {q}"
            for q in existing_questions
        )

        avoid_section = (
            "\nDo not repeat these "
            "existing questions:\n"
            f"{joined_questions}\n"
        )

    return f"""
Generate EXACTLY {count} flashcards about {topic}.

STRICT FORMAT:

Q: question
A: answer

{avoid_section}
"""


def generate_flashcards(
    topic,
    num_flashcards,
    context=None,
    mode="general"
):

    flashcards = []

    seen_questions = set()

    attempts = 0

    while (
        len(flashcards) < num_flashcards
        and attempts < 4
    ):

        remaining = (
            num_flashcards - len(flashcards)
        )

        flashcard_task = (
            build_flashcard_prompt(
                topic,
                remaining,
                [
                    card["question"]
                    for card in flashcards
                ]
            )
        )

        prompt = build_prompt(
            flashcard_task,
            context,
            strict_context=(
                mode == "pdf"
            )
        )

        flashcards_raw = generate(prompt)

        parsed_batch = parse_flashcards(
            flashcards_raw
        )

        for card in parsed_batch:

            normalized_q = (
                card["question"]
                .strip()
                .lower()
            )

            if normalized_q not in seen_questions:

                flashcards.append(card)

                seen_questions.add(
                    normalized_q
                )

            if (
                len(flashcards)
                == num_flashcards
            ):
                break

        attempts += 1

    return flashcards[:num_flashcards]