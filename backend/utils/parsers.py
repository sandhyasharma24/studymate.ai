def parse_flashcards(flashcards_raw):

    parsed = []

    lines = [
        l.strip()
        for l in flashcards_raw.split("\n")
        if l.strip()
    ]

    temp_q = None

    for line in lines:

        if line.startswith("Q:"):

            temp_q = line[2:].strip()

        elif (
            line.startswith("A:")
            and temp_q
        ):

            parsed.append({
                "question": temp_q,
                "answer": line[2:].strip()
            })

            temp_q = None

    return parsed