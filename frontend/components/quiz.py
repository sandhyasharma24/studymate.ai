import streamlit as st

from backend.services.llm_service import (
    generate
)

from backend.utils.prompt_builder import (
    build_prompt
)


# ---------- QUIZ EXPLANATION ----------

def get_quiz_explanation(
    question,
    options,
    correct_answer,
    mode
):

    try:

        explanation_prompt = f"""
Explain this MCQ for a student.

Question:
{question}

Options:
{chr(10).join(options)}

Correct Answer:
{correct_answer}

Explain:
- why the correct answer is right
- why the other options are wrong
- keep explanation concise and educational
"""

        explanation = generate(

            build_prompt(
                explanation_prompt
            )
        )

        return explanation

    except Exception:

        return "Explanation unavailable."


# ---------- QUIZ RENDER ----------

def render_quiz(quiz):

    st.markdown("## ❓ Quiz")

    if "quiz_answers" not in st.session_state:

        st.session_state.quiz_answers = {}

    if "quiz_submitted" not in st.session_state:

        st.session_state.quiz_submitted = False

    if "quiz_score" not in st.session_state:

        st.session_state.quiz_score = 0

    if "quiz_explanations" not in st.session_state:

        st.session_state.quiz_explanations = {}

    # ---------- QUIZ FORM ----------

    if not st.session_state.quiz_submitted:

        for i, q in enumerate(quiz):

            st.write(
                f"### Q{i+1}: {q['question']}"
            )

            choice = st.radio(

                "Choose:",

                q["options"],

                key=f"quiz_{i}",

                index=None
            )

            st.session_state.quiz_answers[i] = (
                choice
            )

            st.markdown("---")

        if st.button("Submit Quiz"):

            st.session_state.quiz_submitted = True

            st.rerun()

    # ---------- RESULTS ----------

    else:

        score = 0

        for i, q in enumerate(quiz):

            st.write(
                f"### Q{i+1}: {q['question']}"
            )

            user = (
                st.session_state
                .quiz_answers
                .get(i)
            )

            correct = q["answer"]

            if user:

                selected = user[0]

                if selected == correct:

                    score += 1

                    st.success(
                        "✅ Correct"
                    )

                else:

                    st.error(
                        f"❌ Wrong — "
                        f"Correct answer: {correct}"
                    )

                if (
                    i not in
                    st.session_state
                    .quiz_explanations
                ):

                    explanation = (
                        get_quiz_explanation(

                            q["question"],

                            q["options"],

                            correct,

                            "general"
                        )
                    )

                    st.session_state[
                        "quiz_explanations"
                    ][i] = explanation

                st.info(

                    st.session_state[
                        "quiz_explanations"
                    ][i]
                )

            st.markdown("---")

        st.session_state.quiz_score = score

        st.subheader(
            f"🎯 Score: "
            f"{score}/{len(quiz)}"
        )

        if st.button("Retry Quiz"):

            st.session_state.quiz_answers = {}

            st.session_state.quiz_submitted = False

            st.session_state.quiz_score = 0

            st.session_state.quiz_explanations = {}

            for idx in range(len(quiz)):

                st.session_state.pop(
                    f"quiz_{idx}",
                    None
                )

            st.rerun()