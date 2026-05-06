from groq import Groq
from backend.core.config import GROQ_API_KEY

client = Groq(api_key=GROQ_API_KEY)


def generate(prompt):
    response = client.chat.completions.create(
        messages=[
            {"role": "user", "content": prompt}
        ],
        model="llama-3.1-8b-instant"
    )

    return response.choices[0].message.content.strip()