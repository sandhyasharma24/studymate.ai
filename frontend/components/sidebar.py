import streamlit as st

from backend.services.rag_service import (
    upload_and_index_pdf
)


def render_sidebar():

    st.sidebar.title(
        "⚙️ Settings"
    )

    st.sidebar.slider(
        "Number of flashcards",
        min_value=1,
        max_value=20,
        value=5,
        key="num_flashcards"
    )

    st.sidebar.radio(
        "Mode",
        options=[
            "General Mode",
            "PDF Mode"
        ],
        key="mode"
    )

    # ---------- PDF MODE ----------

    if st.session_state.mode == "PDF Mode":

        st.sidebar.markdown(
            "### 📄 Upload PDF"
        )

        uploaded_pdf = st.sidebar.file_uploader(
            "Upload study material",
            type=["pdf"]
        )

        if uploaded_pdf is not None:

            if st.sidebar.button(
                "Index PDF"
            ):

                try:

                    pdf_bytes = (
                        uploaded_pdf.read()
                    )

                    chunk_count = (
                        upload_and_index_pdf(
                            pdf_bytes
                        )
                    )

                    st.session_state.rag_ready = True

                    st.sidebar.success(
                        f"PDF indexed successfully "
                        f"({chunk_count} chunks)"
                    )

                except Exception as e:

                    st.sidebar.error(
                        f"Error: {str(e)}"
                    )

        if st.session_state.get(
            "rag_ready"
        ):

            st.sidebar.success(
                "RAG Ready ✅"
            )