import streamlit as st

from frontend.components.summary import (
    render_summary
)

from frontend.components.flashcards import (
    render_flashcards
)

from frontend.components.quiz import (
    render_quiz
)

from frontend.components.qa import (
    render_qa
)

from frontend.components.sidebar import (
    render_sidebar
)

# ---------- BACKEND IMPORTS ----------

from backend.services.llm_service import (
    generate
)

from backend.services.flashcard_service import (
    generate_flashcards
)

from backend.services.quiz_service import (
    generate_quiz
)

from backend.services.rag_service import (
    retrieve_relevant_chunks
)

from backend.utils.prompt_builder import (
    build_prompt
)

# ---------- PAGE CONFIG ----------

st.set_page_config(
    page_title="StudyMate AI",
    page_icon="📚",
    layout="wide"
)

# ---------- LOAD CSS ----------

with open(
    "frontend/styles/main.css"
) as f:

    st.markdown(
        f"<style>{f.read()}</style>",
        unsafe_allow_html=True
    )

# ---------- SESSION STATE ----------

if "data" not in st.session_state:
    st.session_state.data = None

if "rag_ready" not in st.session_state:
    st.session_state.rag_ready = False

# ---------- HERO SECTION ----------

st.markdown(
    """
<div class="hero-container">

<div class="hero-title">
📚 StudyMate AI
</div>

<div class="hero-subtitle">
Your AI-powered learning companion
for summaries, flashcards,
interactive quizzes,
and document-based learning using RAG.
</div>

<div class="badge-container">
    <div class="badge">AI Summaries</div>
    <div class="badge">Interactive Flashcards</div>
    <div class="badge">Smart Quiz Mode</div>
    <div class="badge">PDF Learning (RAG)</div>
</div>

</div>
""",
    unsafe_allow_html=True
)

# ---------- SIDEBAR ----------

render_sidebar()

# ---------- CHAT INPUT ----------

user_input = st.chat_input(
    "Enter topic or question..."
)

# ---------- GENERATE ----------

if user_input:

    try:

        backend_mode = (
            "pdf"
            if st.session_state.mode
            == "PDF Mode"
            else "general"
        )

        with st.spinner(
            "Generating learning content..."
        ):

            context = None

            retrieved_chunks = []

            # ---------- PDF MODE ----------

            if backend_mode == "pdf":

                retrieved_chunks = (
                    retrieve_relevant_chunks(
                        user_input,
                        top_k=5
                    )
                )

                context = "\n\n".join(
                    retrieved_chunks
                )

            # ---------- SUMMARY ----------

            summary = generate(

                build_prompt(

                    f"""
Create a student-friendly summary about:

{user_input}

Use bullet points where useful.
Keep explanation educational and easy to understand.
""",

                    context,

                    strict_context=(
                        backend_mode == "pdf"
                    )
                )
            )

            # ---------- FLASHCARDS ----------

            flashcards = generate_flashcards(

                user_input,

                st.session_state.num_flashcards,

                context,

                backend_mode
            )

            # ---------- QUIZ ----------

            quiz = generate_quiz(

                user_input,

                context,

                backend_mode
            )

            # ---------- QA ----------

            answer = generate(

                build_prompt(

                    f"""
Answer this student question clearly and concisely.

Question:
{user_input}
""",

                    context,

                    strict_context=(
                        backend_mode == "pdf"
                    )
                )
            )

            st.session_state.data = {

                "summary": summary,

                "flashcards": flashcards,

                "quiz": quiz,

                "answer": answer,

                "retrieved_chunks":
                    retrieved_chunks
            }

    except Exception as e:

        st.error(
            f"Error: {str(e)}"
        )

# ---------- DISPLAY ----------

if st.session_state.data:

    data = st.session_state.data

    tab1, tab2, tab3, tab4 = st.tabs([

        "📘 Summary",

        "🧠 Flashcards",

        "❓ Quiz",

        "💬 Q&A"
    ])

    # ---------- SUMMARY ----------

    with tab1:

        render_summary(
            data["summary"]
        )

    # ---------- FLASHCARDS ----------

    with tab2:

        render_flashcards(
            data["flashcards"]
        )

    # ---------- QUIZ ----------

    with tab3:

        render_quiz(
            data["quiz"]
        )

    # ---------- QA ----------

    with tab4:

        render_qa(
            data["answer"],
            data["retrieved_chunks"]
        )