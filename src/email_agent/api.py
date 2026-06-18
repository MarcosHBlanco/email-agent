"""FastAPI web layer for the email agent.

Exposes two distinct paths:
  - GET  /digest/latest   -> read the most recent stored digest (fast, no Claude)
  - POST /digest/process  -> run a new processing pass (slow, calls Claude)

"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from email_agent import db
from email_agent.summarizer import run_digest

app = FastAPI(title="Email Agent")

# Allow the frontend (different origin/port) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict:
    """Health check: confirms the API is running."""
    return {"status": "ok", "service": "email-agent"}


@app.get("/digest/latest")
def get_latest_digest() -> dict:
    """READ path: return the most recent stored digest snapshot.

    Fast — just a database read, no Claude calls. Returns the stored digest,
    or a 'no digest yet' shape if nothing has been processed.
    """
    digest = db.get_latest_digest()
    if digest is None:
        return {
            "digest": None,
            "message": "No digest yet. Process emails to create one.",
        }
    return {"digest": digest}


@app.post("/digest/process")
def process_digest() -> dict:
    """WRITE path: run a new processing pass (fetch, categorize, store).

    Slow — calls Claude for each new email. Returns the freshly produced digest.
    """
    digest = run_digest()
    return {"digest": digest}


@app.get("/analytics/daily")
def get_daily_analytics() -> dict:
    """READ path: per-day category counts across all history.

    Feeds both the calendar grid and the trend charts. Fast — just a
    database aggregation, no Claude calls.
    """
    data = db.get_daily_analytics()
    return {"analytics": data}
