def build_prompt(
    task,
    context=None,
    strict_context=False
):

    if context:

        # ---------- STRICT PDF MODE ----------
        if strict_context:

            return f"""
You are a helpful AI study assistant.

Answer ONLY using the provided context below.

If the answer is not present in the context,
clearly say:
"I could not find this in the uploaded document."

Context:
{context}

Task:
{task}
"""

        # ---------- GENERAL CONTEXT ----------
        return f"""
You are a helpful AI study assistant.

Use the provided context if relevant.

Context:
{context}

Task:
{task}
"""

    # ---------- NO CONTEXT ----------
    return f"""
You are a helpful AI study assistant.

Task:
{task}
"""