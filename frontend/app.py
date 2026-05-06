import streamlit as st
import requests

from components.summary import (
    render_summary
)

from components.flashcards import (
    render_flashcards
)

from components.quiz import (
    render_quiz
)

from components.qa import (
    render_qa
)

from components.sidebar import (
    render_sidebar
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

            response = requests.post(

                "http://127.0.0.1:8000/generate",

                json={
                    "topic": user_input,

                    "num_flashcards":
                        st.session_state
                        .num_flashcards,

                    "mode":
                        backend_mode
                }
            )

        if response.ok:

            st.session_state.data = (
                response.json()
            )

        else:

            st.error(
                response.json().get(
                    "detail",
                    "Request failed."
                )
            )

    except requests.RequestException:

        st.error(
            "Could not connect to backend."
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