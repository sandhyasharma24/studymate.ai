import streamlit as st
import streamlit.components.v1 as components
import json
from html import escape


def render_flashcards(cards):

    st.markdown("## 🧠 Flashcards")

    st.caption(
        "Practice active recall using interactive flashcards."
    )

    if not cards:

        st.warning("No flashcards generated.")

        return

    flashcards = cards[:20]

    cards_json = json.dumps(
        [
            {
                "question": escape(
                    card.get("question", "")
                ),
                "answer": escape(
                    card.get("answer", "")
                )
            }
            for card in flashcards
        ]
    )

    flashcards_html = f"""
    <div class="fc-root">

        <div class="fc-counter" id="fc-counter"></div>

        <div class="fc-stage" id="fc-stage"></div>

        <div class="fc-help">
            Click the flashcard to flip.
        </div>

        <div class="fc-controls">
            <button id="fc-prev" class="fc-btn">
                ← Prev
            </button>

            <button id="fc-next" class="fc-btn">
                Next →
            </button>
        </div>
    </div>

    <style>

        .fc-root {{
            max-width: 950px;
            margin: 0 auto;
            padding-top: 1rem;
            font-family: "Inter", sans-serif;
        }}

        .fc-counter {{
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: white;
        }}

        .fc-stage {{
            position: relative;
            min-height: 320px;
            perspective: 1200px;
        }}

        .fc-card {{
            position: absolute;
            inset: 0;
            display: none;
            cursor: pointer;
        }}

        .fc-card.active {{
            display: block;
        }}

        .fc-inner {{
            width: 100%;
            height: 100%;
            min-height: 320px;
            position: relative;
            transform-style: preserve-3d;
            transition: transform 0.6s ease;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.18);
        }}

        .fc-card.flipped .fc-inner {{
            transform: rotateY(180deg);
        }}

        .fc-face {{
            position: absolute;
            inset: 0;
            border-radius: 20px;
            padding: 2rem;
            backface-visibility: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }}

        .fc-front {{
            background: linear-gradient(
                180deg,
                #f8fafc,
                #eef2ff
            );
        }}

        .fc-back {{
            background: linear-gradient(
                180deg,
                #ecfdf3,
                #dcfce7
            );
            transform: rotateY(180deg);
        }}

        .fc-label {{
            text-transform: uppercase;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #475569;
            margin-bottom: 1rem;
        }}

        .fc-front .fc-text {{
            font-size: 2rem;
            line-height: 1.35;
            font-weight: 800;
            color: #0f172a;
        }}

        .fc-back .fc-text {{
            font-size: 1.3rem;
            line-height: 1.6;
            font-weight: 600;
            color: #14532d;
        }}

        .fc-help {{
            margin-top: 1rem;
            margin-bottom: 1rem;
            color: #CBD5E1;
            font-size: 0.95rem;
        }}

        .fc-controls {{
            display: flex;
            justify-content: center;
            gap: 1rem;
        }}

        .fc-btn {{
            padding: 0.6rem 1.1rem;
            border-radius: 10px;
            border: none;
            background: linear-gradient(
                135deg,
                #8B5CF6,
                #06B6D4
            );
            color: white;
            font-weight: 700;
            cursor: pointer;
        }}

    </style>

    <script>

        const data = {cards_json};

        const stage = document.getElementById("fc-stage");
        const counter = document.getElementById("fc-counter");

        const prevBtn = document.getElementById("fc-prev");
        const nextBtn = document.getElementById("fc-next");

        let currentIndex = 0;

        function renderCards() {{

            stage.innerHTML = "";

            data.forEach((card, index) => {{

                const wrapper =
                    document.createElement("div");

                wrapper.className = "fc-card";

                if(index === 0)
                    wrapper.classList.add("active");

                wrapper.innerHTML = `
                    <div class="fc-inner">

                        <div class="fc-face fc-front">
                            <div class="fc-label">
                                Question
                            </div>

                            <div class="fc-text">
                                ${{card.question}}
                            </div>
                        </div>

                        <div class="fc-face fc-back">
                            <div class="fc-label">
                                Answer
                            </div>

                            <div class="fc-text">
                                ${{card.answer}}
                            </div>
                        </div>

                    </div>
                `;

                wrapper.addEventListener("click", () => {{
                    wrapper.classList.toggle("flipped");
                }});

                stage.appendChild(wrapper);
            }});

            updateUI();
        }}

        function updateUI() {{

            const cards =
                Array.from(
                    document.querySelectorAll(".fc-card")
                );

            cards.forEach((card, idx) => {{
                card.classList.toggle(
                    "active",
                    idx === currentIndex
                );
            }});

            counter.textContent =
                `Card ${{currentIndex + 1}}/${{data.length}}`;

            prevBtn.disabled = currentIndex === 0;

            nextBtn.disabled =
                currentIndex === data.length - 1;
        }}

        prevBtn.addEventListener("click", () => {{

            if(currentIndex > 0) {{
                currentIndex--;
                updateUI();
            }}

        }});

        nextBtn.addEventListener("click", () => {{

            if(currentIndex < data.length - 1) {{
                currentIndex++;
                updateUI();
            }}

        }});

        renderCards();

    </script>
    """

    components.html(
        flashcards_html,
        height=520
    )