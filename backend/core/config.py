import os
from dotenv import load_dotenv
from huggingface_hub import login

load_dotenv()

# ---------- API KEYS ----------

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

HF_TOKEN = os.getenv("HF_TOKEN")

# ---------- HUGGINGFACE LOGIN ----------

if HF_TOKEN:
    login(token=HF_TOKEN)