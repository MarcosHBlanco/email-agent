"""FastAPI web layer for the email agent.

Exposes the digest as an HTTP endpoint that returns JSON. Run with:
    uv run uvicorn email_agent.api:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from email_agent.summarizer import run_digest

app = FastAPI(title="Email Agent")

# Allow the frontend (running on a different origin/port) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict:
    """Health check: confirms the API is running."""
    return {"status": "ok", "service": "email-agent"}


@app.get("/digest")
def get_digest() -> dict:
    """Run a full digest cycle and return the structured result as JSON."""
    digest_data = run_digest()
    return digest_data
