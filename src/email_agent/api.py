"""FastAPI web layer for the email agent.

Exposes two distinct paths:
  - GET  /digest/latest   -> read the most recent stored digest (fast, no Claude)
  - POST /digest/process  -> run a new processing pass (slow, calls Claude)

"""

import os
import secrets

from click import prompt
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from zoneinfo import ZoneInfo  # or hoist to module imports
from contextlib import asynccontextmanager

from dotenv import load_dotenv

from email_agent.gmail_client import (
    GmailNotConnectedError,
    GmailReauthError,
    SCOPES as GMAIL_SCOPES,
)
from email_agent import personas

load_dotenv()  # load .env before anything reads env vars

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
REDIRECT_URI = f"{BACKEND_URL}/auth/gmail/callback"

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# The client config the Google Flow object expects (built from env vars,
# rather than a credentials.json file, so secrets stay in .env).
GOOGLE_CLIENT_CONFIG = {
    "web": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }
}

from fastapi import FastAPI, Response, Cookie, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from email_agent import db, auth
from email_agent.summarizer import run_digest


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once on startup: make sure the schema exists before serving traffic.

    Previously this only ran inside run_digest(), so a fresh database left
    auth endpoints querying tables that didn't exist yet.
    """
    db.init_db()
    yield


app = FastAPI(title="Email Agent", lifespan=lifespan)


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
    allow_origins=[FRONTEND_URL],
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
    digest = db.get_todays_digest(user["id"])
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
    try:
        digest = run_digest(user["id"])
    except GmailNotConnectedError:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "gmail_not_connected",
                "message": "No Gmail account connected. Please connect your Gmail first.",
            },
        )
    except GmailReauthError:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "gmail_reauth_required",
                "message": "Your Gmail connection expired. Please reconnect to continue.",
            },
        )
    return {"digest": digest}


@app.post("/emails/{gmail_id}/read")
def mark_email_read(gmail_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Mark one of the current user's emails as read."""
    ok = db.mark_email_read(user["id"], gmail_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"ok": True}


@app.get("/analytics/daily")
def get_daily_analytics(user: dict = Depends(get_current_user)) -> dict:
    """READ path: per-day category counts across all history.

    Feeds both the calendar grid and the trend charts. Fast — just a
    database aggregation, no Claude calls.
    """
    data = db.get_daily_analytics(user["id"])
    return {"analytics": data}


class PreferencesUpdate(BaseModel):
    profession: str = ""
    interests: list[str] = []
    important_senders: str = ""
    important_keywords: str = ""
    important_examples: str = ""
    routine_examples: str = ""
    junk_examples: str = ""


@app.get("/preferences")
def get_preferences(user: dict = Depends(get_current_user)) -> dict:
    """Return the current user's cagegorization preferences (or None if unset.)"""
    preferences = db.get_user_preferences(user["id"])
    return {"preferences": preferences}


@app.put("/preferences")
def update_preferences(
    body: PreferencesUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Save the current user's categorization preferences."""
    db.save_user_preferences(user["id"], body.model_dump())
    return {"status": "saved", "preferences": body.model_dump()}


@app.get("/preferences/personas")
def get_personas() -> dict:
    """Return the persona templates for onboarding (label, description, seed)."""
    return {
        "personas": [
            {
                "key": key,
                "label": p["label"],
                "description": p["description"],
                "seed": p["seed"],
            }
            for key, p in personas.PERSONAS.items()
        ],
        "interest_options": personas.INTEREST_OPTIONS,
    }


# ===== Auth =====


class AuthRequest(BaseModel):
    email: str
    password: str
    timezone: str = "UTC"  # IANA name from the browser; UTC if not sent


@app.post("/auth/signup")
def signup(body: AuthRequest, response: Response) -> dict:
    """Create a new user, log them in, and set their session cookie."""
    # Email already used?
    existing = db.get_user_by_email(body.email)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        ZoneInfo(body.timezone)
        tz = body.timezone
    except Exception:
        tz = "UTC"

    # Hash the password and create the user.
    password_hash = auth.hash_password(body.password)
    user_id = db.create_user(body.email, password_hash, body.timezone)

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


@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)) -> dict:
    """Return the currently logged-in user, or 401 if not authenticated.

    The frontend calls this on load to check whether someone is logged in.
    """

    return {"id": user["id"], "email": user["email"]}


def build_gmail_flow() -> Flow:
    """Build a Gmail OAuth Flow with PKCE's code verifier disabled.

    This is a confidential client (we hold a client secret server-side), so the
    secret provides the security PKCE would add for public clients. Disabling
    the auto-generated code verifier avoids needing to persist it between the
    connect and callback requests (which use separate Flow instances).
    """
    flow = Flow.from_client_config(
        GOOGLE_CLIENT_CONFIG,
        scopes=GMAIL_SCOPES,
        redirect_uri=REDIRECT_URI,
        autogenerate_code_verifier=False,
    )
    return flow


@app.get("/auth/gmail/connect")
def gmail_connect(user: dict = Depends(get_current_user)):
    """Start the Gmail OAuth flow: redirect the user to Google's consent screen."""
    flow = build_gmail_flow()

    # Generate a random state (CSRF ticket) and remember it for this user.
    state = secrets.token_urlsafe(32)
    db.save_oauth_state(state, user["id"])

    # Build Google's authorization URL.
    auth_url, _ = flow.authorization_url(
        access_type="offline",  # so we get a refresh token
        prompt="consent",  # force the consent screen (ensures refresh token)
        state=state,  # our CSRF ticket, round-trip through Google
    )

    # Redirect the user's browser to Google.
    return RedirectResponse(auth_url)


@app.get("/auth/gmail/callback")
def gmail_callback(code: str, state: str):
    """Handle Google's redirect: verify state, exchange code for tokens, store them."""
    # 1. Verify the state (CSRF check) — must match one we issued.
    state_record = db.get_oauth_state(state)
    if state_record is None:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    user_id = state_record["user_id"]
    db.delete_oauth_state(state)  # one-time use — consume it now

    # 2. Exchange the authorization code for tokens.
    flow = build_gmail_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials

    # 3. Find out which Gmail address they connected.
    service = build("gmail", "v1", credentials=creds)
    profile = service.users().getProfile(userId="me").execute()
    google_email = profile["emailAddress"]

    # 4. Store the connection (tokens encrypted in the db layer).
    if creds.token is None or creds.refresh_token is None:
        # Missing tokens — usually means Google didn't issue a refresh token.
        # Send the user back to reconnect (with a flag the frontend can read).
        raise HTTPException(
            status_code=400,
            detail="Gmail connection failed: no refresh token received. Please try connecting again.",
        )

    db.save_gmail_connection(
        user_id=user_id,
        google_email=google_email,
        access_token=creds.token,
        refresh_token=creds.refresh_token,
        token_expiry=creds.expiry.isoformat() if creds.expiry else "",
    )

    # 5. Send the user back to the app.
    return RedirectResponse(f"{FRONTEND_URL}/app")


@app.get("/auth/gmail/status")
def gmail_status(user: dict = Depends(get_current_user)) -> dict:
    """Report whether the current user has a Gmail account connected."""
    connection = db.get_gmail_connection(user["id"])
    if connection is None:
        return {"connected": False, "email": None}
    return {"connected": True, "email": connection["google_email"]}
