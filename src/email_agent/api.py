"""FastAPI web layer for the email agent.

Exposes two distinct paths:
  - GET  /digest/latest   -> read the most recent stored digest (fast, no Claude)
  - POST /digest/process  -> run a new processing pass (slow, calls Claude)

"""

from fastapi import FastAPI, Response, Cookie, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from email_agent import db, auth
from email_agent.summarizer import run_digest

app = FastAPI(title="Email Agent")


def get_current_user(session: str | None = Cookie(default=None)) -> dict:
    """Dependency: identify the logged-in user from their session cookie.

    Runs before a protected endpoint. If the session is missing, invalid,
    or expired, it rejects the request with 401 and the endpoint never runs.
    Otherwise it returns the user dict, which the endpoint receives.
    """
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = auth.get_session_user(session)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = db.get_user_by_id(user_id)
    if user is None:
        # Session pointed to a user that no longer exists — treat as unauthenticated.
        raise HTTPException(status_code=401, detail="Not authenticated")

    return user


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
def get_latest_digest(user: dict = Depends(get_current_user)) -> dict:
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
def process_digest(user: dict = Depends(get_current_user)) -> dict:
    """WRITE path: run a new processing pass (fetch, categorize, store).

    Slow — calls Claude for each new email. Returns the freshly produced digest.
    """
    digest = run_digest()
    return {"digest": digest}


@app.get("/analytics/daily")
def get_daily_analytics(user: dict = Depends(get_current_user)) -> dict:
    """READ path: per-day category counts across all history.

    Feeds both the calendar grid and the trend charts. Fast — just a
    database aggregation, no Claude calls.
    """
    data = db.get_daily_analytics()
    return {"analytics": data}


# ===== Auth =====


class AuthRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/signup")
def signup(body: AuthRequest, response: Response) -> dict:
    """Create a new user, log them in, and set their session cookie."""
    # Email already used?
    existing = db.get_user_by_email(body.email)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash the password and create the user.
    password_hash = auth.hash_password(body.password)
    user_id = db.create_user(body.email, password_hash)

    # Log them in immediately: create a session and set it as a cookie.
    token = auth.create_session(user_id)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,  # 30 days in seconds
    )
    return {"id": user_id, "email": body.email}


@app.post("/auth/login")
def login(body: AuthRequest, response: Response) -> dict:
    """Verify credentials, log the user in, and set their session cookie."""
    user = db.get_user_by_email(body.email)

    # Same error whether the email is unknown OR the password is wrong.
    if user is None or not auth.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_session(user["id"])
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,
    )
    return {"id": user["id"], "email": user["email"]}


@app.post("/auth/logout")
def logout(response: Response, session: str | None = Cookie(default=None)) -> dict:
    """Log out: delete the session and clear the cookie."""
    if session is not None:
        auth.delete_session(session)
    response.delete_cookie(key="session")
    return {"ok": True}
