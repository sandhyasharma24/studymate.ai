import streamlit as st


def render_qa(answer, retrieved_chunks):

    st.markdown("## 💬 Q&A")

    st.info(answer)

    if retrieved_chunks:

        st.markdown("### 📄 Retrieved Context")

        for idx, chunk in enumerate(retrieved_chunks, start=1):

            with st.expander(f"Chunk {idx}"):

                st.write(chunk)