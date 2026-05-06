import streamlit as st
import requests


def render_sidebar():

    st.slider(
        "Number of flashcards",
        min_value=1,
        max_value=20,
        value=5,
        key="num_flashcards"
    )

    st.radio(
        "Mode",
        options=["General Mode", "PDF Mode"],
        key="mode",
        horizontal=True
    )

    # ---------- PDF MODE ----------
    if st.session_state.mode == "PDF Mode":

        st.markdown("## 📄 PDF Learning")

        uploaded_pdf = st.file_uploader(
            "Upload PDF",
            type=["pdf"],
            key="rag_pdf_upload"
        )

        if uploaded_pdf is not None:

            if st.button("Index PDF"):

                files = {
                    "file": (
                        uploaded_pdf.name,
                        uploaded_pdf.getvalue(),
                        "application/pdf"
                    )
                }

                try:

                    upload_response = requests.post(
                        "http://127.0.0.1:8000/rag/upload",
                        files=files
                    )

                    if upload_response.ok:

                        st.session_state.rag_ready = True

                        result = upload_response.json()

                        st.success(
                            f"PDF indexed successfully. "
                            f"Chunks indexed: "
                            f"{result.get('chunks_indexed', 0)}"
                        )

                    else:

                        st.session_state.rag_ready = False

                        st.error(
                            upload_response.json().get(
                                "detail",
                                "Failed to index PDF."
                            )
                        )

                except requests.RequestException:

                    st.session_state.rag_ready = False

                    st.error(
                        "Could not connect to backend."
                    )

        if st.session_state.get("rag_ready"):

            st.caption(
                "PDF indexed successfully. "
                "All features now use document context."
            )