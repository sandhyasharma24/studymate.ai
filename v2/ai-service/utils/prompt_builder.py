"""
Prompt builder — constructs system + task prompts for all three modes:
  1. no_context  — pure LLM knowledge
  2. soft_context — use context if relevant, may supplement with general knowledge
  3. strict_context — answer ONLY from context (PDF mode)
"""

SYSTEM_ROLE = "You are StudyMate AI, an expert educational assistant. Provide accurate, clear, and engaging responses suited for students."


def no_context(task: str) -> str:
    return f"""{SYSTEM_ROLE}

Task:
{task}"""


def soft_context(task: str, context: str) -> str:
    return f"""{SYSTEM_ROLE}

Use the following context if it is relevant to the task.
You may also draw on your general knowledge to enrich the answer.

Context:
{context}

Task:
{task}"""


def strict_context(task: str, context: str) -> str:
    return f"""{SYSTEM_ROLE}

Primary Instructions:
1. Ground your answer in the provided "Context" below as much as possible.
2. If the "Context" contains the answer, explain it clearly using that information.
3. If the "Context" does NOT contain the necessary information to answer the question, do NOT refuse. Instead, answer the question fully and accurately using your general educational knowledge, but prepend this note at the very beginning of your response:
"*(Note: This response is based on general knowledge, as this specific detail was not found in the uploaded document)*"

Context:
{context}

Task:
{task}"""


def build_prompt(
    task: str,
    context: str | None = None,
    strict: bool = False,
) -> str:
    """
    Convenience wrapper.

    Args:
        task: The specific instruction for the LLM.
        context: Optional retrieved text (RAG chunks joined by \\n\\n).
        strict: If True and context is provided, enforce strict-context mode.

    Returns:
        Complete prompt string ready to send to the LLM.
    """
    if context and strict:
        return strict_context(task, context)
    if context:
        return soft_context(task, context)
    return no_context(task)
