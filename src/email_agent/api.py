"""FastAPI web layer for the email agent.

Exposes two distinct paths:
  - GET  /digest/latest   -> read the most recent stored digest (fast, no Claude)
  - POST /digest/process  -> run a new processing pass (slow, calls Claude)

"""

import os
import secrets
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import asynccontextmanager
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi.responses import JSONResponse, RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from dotenv import load_dotenv

from email_agent.gmail_client import (
    GmailNotConnectedError,
    GmailReauthError,
    SCOPES as GMAIL_SCOPES,
    fetch_email_body,
    get_email_service,
    revoke_gmail_token,
    trash_email,
    untrash_email,
    build_reply_message,
    send_reply,
)
from email_agent import personas
from email_agent.csrf import csrf_is_allowed
from email_agent.rate_limit import limiter
from email_agent.sanitize import sanitize_reply_html
from email_agent.summarizer import DigestInProgressError, run_digest

import sentry_sdk

SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.environ.get("SENTRY_ENV", "production"),
        # No traces_sample_rate — error tracking only, not performance
        # monitoring, which would sample every request and burn the quota.
        # No send_default_pii — our requests carry session cookies and the
        # cron secret header; we don't want those in error reports.
    )

load_dotenv()  # load .env before anything reads env vars

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
REDIRECT_URI = f"{BACKEND_URL}/auth/gmail/callback"

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Shared secret for the scheduled-runs endpoint. Without it that endpoint
# would be an open trigger for Claude API calls on our bill.
CRON_SECRET = os.environ.get("CRON_SECRET", "")

# Local hours (in each user's own timezone) when a digest should run.
SCHEDULED_HOURS = {9, 13, 17}

# Cookie policy depends on whether the frontend and backend are same-site.
# Locally both are localhost -> same-site, so Lax works and Secure would
# break (localhost is http). In production they're on different domains
# (vercel.app vs onrender.com) -> CROSS-site, so the browser only sends the
# cookie if SameSite=None, which in turn REQUIRES Secure.
IS_PRODUCTION = FRONTEND_URL.startswith("https://")
COOKIE_SAMESITE: Literal["lax", "none"] = "none" if IS_PRODUCTION else "lax"
COOKIE_SECURE = IS_PRODUCTION

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

from fastapi import FastAPI, Response, Cookie, HTTPException, Depends, Header, Request
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from email_agent import config, db, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once on startup: pool + schema before serving traffic."""
    db.init_pool()
    db.init_db()
    yield
    db.close_pool()


app = FastAPI(title="Email Agent", lifespan=lifespan)


def _client_ip(request: Request) -> str:
    # Render (and most proxies) put the real client in the first X-Forwarded-For hop.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def csrf_origin_middleware(request: Request, call_next):
    """Reject cross-site mutating requests whose Origin is not the frontend."""
    if not csrf_is_allowed(
        method=request.method,
        path=request.url.path,
        origin=request.headers.get("origin"),
        frontend_url=FRONTEND_URL,
        production=IS_PRODUCTION,
        exempt_paths={"/cron/run-digests"},
    ):
        return JSONResponse({"detail": "CSRF check failed"}, status_code=403)
    return await call_next(request)


def _most_recent_slot(now_local: datetime) -> datetime | None:
    """The latest scheduled slot that has already passed today, in local time.

    Returns None before the day's first slot — we don't want a 3am digest.
    """
    passed = [h for h in sorted(SCHEDULED_HOURS) if now_local.hour >= h]
    if not passed:
        return None
    return now_local.replace(hour=passed[-1], minute=0, second=0, microsecond=0)


# Endpoint for scheduled runs ran by an external scheduler
@app.post("/cron/run-digests")
def cron_run_digests(x_cron_secret: str = Header(default="")) -> dict:
    """Run digests for every user whose local time is a scheduled hour.

    Called hourly by an external scheduler. Hourly rather than three times a
    day because a cron schedule is a fixed UTC time and can't know each
    user's timezone — so we fire every hour and let this endpoint decide who
    is due. One schedule serves every timezone.
    """
    if not CRON_SECRET or not secrets.compare_digest(x_cron_secret, CRON_SECRET):
        raise HTTPException(status_code=401, detail="Not authorized")

    now_utc = datetime.now(timezone.utc)
    results: dict = {"ran": [], "skipped": [], "failed": []}
    due: list[int] = []

    for user in db.get_users_with_gmail():
        user_id = user["id"]
        try:
            tz = ZoneInfo(user["timezone"] or "UTC")
        except Exception:
            tz = ZoneInfo("UTC")

        slot = _most_recent_slot(now_utc.astimezone(tz))
        if slot is None:
            results["skipped"].append(user_id)
            continue

        slot_utc = slot.astimezone(timezone.utc).isoformat()
        if db.has_run_since(user_id, slot_utc):
            results["skipped"].append(user_id)
            continue

        due.append(user_id)

    def _run_due(user_id: int) -> tuple[str, int, str | None]:
        try:
            run_digest(user_id)
            return ("ran", user_id, None)
        except DigestInProgressError:
            return ("skipped", user_id, None)
        except Exception as e:
            sentry_sdk.capture_exception(
                e,
                tags={"phase": "scheduled_digest", "user_id": user_id},
            )
            return ("failed", user_id, str(e))

    if due:
        workers = min(config.CRON_USER_WORKERS, len(due))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(_run_due, uid) for uid in due]
            for future in as_completed(futures):
                kind, user_id, err = future.result()
                if kind == "ran":
                    results["ran"].append(user_id)
                elif kind == "skipped":
                    results["skipped"].append(user_id)
                else:
                    results["failed"].append({"user_id": user_id, "error": err})

    return results


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


@app.get("/emails/all")
def get_all_emails(
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
) -> dict:
    """Paginated flat list of all non-trashed emails, newest first."""
    # Clamp limit so a caller can't request a huge page and bypass pagination
    # (e.g. ?limit=100000 would load the whole table — the thing we're avoiding).
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    return db.get_all_emails(user["id"], limit, offset)


@app.get("/emails/trash")
def get_trashed_emails(
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
) -> dict:
    """Paginated flat list of trashed emails, newest first."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    return db.get_trashed_emails(user["id"], limit, offset)


@app.post("/digest/process")
def process_digest(user: dict = Depends(get_current_user)) -> dict:
    """WRITE path: run a new processing pass (fetch, categorize, store).

    Slow — calls Claude for each new email. Returns the freshly produced digest.
    """
    if not limiter.allow(
        f"digest:{user['id']}", limit=6, window_seconds=3600
    ):
        raise HTTPException(
            status_code=429,
            detail="Too many digest runs. Try again later.",
        )
    try:
        digest = run_digest(user["id"])
    except DigestInProgressError:
        raise HTTPException(
            status_code=429,
            detail="A digest is already running for this account. Try again shortly.",
        )
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


@app.post("/emails/{gmail_id}/trash")
def trash_email_endpoint(gmail_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Move an email to Gmail's trash and hide it from the digest."""
    try:
        service = get_email_service(user["id"])
        trash_email(service, gmail_id)
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

    # Gmail is the source of truth, so it goes first — if that call fails we
    # never touch our own row, and the two stay consistent.
    db.mark_email_trashed(user["id"], gmail_id)
    return {"ok": True}


@app.post("/emails/{gmail_id}/untrash")
def untrash_email_endpoint(
    gmail_id: str, user: dict = Depends(get_current_user)
) -> dict:
    """Restore an email from trash (undo)."""
    try:
        service = get_email_service(user["id"])
        untrash_email(service, gmail_id)
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

    db.unmark_email_trashed(user["id"], gmail_id)
    return {"ok": True}


@app.get("/emails/{gmail_id}/body")
def get_email_body(gmail_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Fetch one email's full content from Gmail, on demand.

    Nothing is stored — we fetch, return, and forget. Gmail stays the single
    source of truth for email content.
    """
    try:
        service = get_email_service(user["id"])
        body = fetch_email_body(service, gmail_id)
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
    return body


@app.get("/analytics/daily")
def get_daily_analytics(user: dict = Depends(get_current_user)) -> dict:
    """READ path: per-day category counts across all history.

    Feeds both the calendar grid and the trend charts. Fast — just a
    database aggregation, no Claude calls.
    """
    data = db.get_daily_analytics(user["id"])
    return {"analytics": data}


class PreferencesUpdate(BaseModel):
    profession: str = Field(default="", max_length=200)
    interests: list[str] = Field(default_factory=list, max_length=20)
    important_senders: str = Field(default="", max_length=2000)
    important_keywords: str = Field(default="", max_length=2000)
    important_examples: str = Field(default="", max_length=4000)
    routine_examples: str = Field(default="", max_length=4000)
    junk_examples: str = Field(default="", max_length=4000)

    @field_validator("interests")
    @classmethod
    def _cap_interest_items(cls, value: list[str]) -> list[str]:
        return [item[:100] for item in value]


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


class LoginRequest(BaseModel):
    email: str
    password: str
    timezone: str = "UTC"

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return auth.normalize_email(value)

    @field_validator("password")
    @classmethod
    def _reject_bcrypt_overflow(cls, value: str) -> str:
        if len(value.encode("utf-8")) > config.BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("Password is too long")
        return value


class SignupRequest(LoginRequest):
    @field_validator("password")
    @classmethod
    def _password_policy(cls, value: str) -> str:
        if len(value.encode("utf-8")) > config.BCRYPT_MAX_PASSWORD_BYTES:
            raise ValueError("Password is too long")
        if len(value) < config.MIN_PASSWORD_LENGTH:
            raise ValueError("Password must be at least 8 characters")
        return value


@app.post("/auth/signup")
def signup(body: SignupRequest, response: Response, request: Request) -> dict:
    """Create a new user, log them in, and set their session cookie."""
    if not limiter.allow(
        f"signup:ip:{_client_ip(request)}", limit=5, window_seconds=3600
    ):
        raise HTTPException(status_code=429, detail="Too many signup attempts")

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
    user_id = db.create_user(body.email, password_hash, tz)

    # Log them in immediately: create a session and set it as a cookie.
    token = auth.create_session(user_id)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 30,
    )
    return {"id": user_id, "email": body.email}


@app.post("/auth/login")
def login(body: LoginRequest, response: Response, request: Request) -> dict:
    """Verify credentials, log the user in, and set their session cookie."""
    ip = _client_ip(request)
    if not limiter.allow(f"login:ip:{ip}", limit=10, window_seconds=900):
        raise HTTPException(status_code=429, detail="Too many login attempts")
    if not limiter.allow(f"login:email:{body.email}", limit=10, window_seconds=900):
        raise HTTPException(status_code=429, detail="Too many login attempts")

    user = db.get_user_by_email(body.email)

    # Same error whether the email is unknown OR the password is wrong.
    if user is None or not auth.verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_session(user["id"])
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 30,
    )
    return {"id": user["id"], "email": user["email"]}


@app.post("/auth/logout")
def logout(response: Response, session: str | None = Cookie(default=None)) -> dict:
    """Log out: delete the session and clear the cookie."""
    if session is not None:
        auth.delete_session(session)
    response.delete_cookie(
        key="session",
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
    )
    return {"ok": True}


@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)) -> dict:
    """Return the currently logged-in user, or 401 if not authenticated.

    The frontend calls this on load to check whether someone is logged in.
    """

    return {"id": user["id"], "email": user["email"]}


def build_gmail_flow(*, code_verifier: str | None = None, generate_pkce: bool = False) -> Flow:
    """Build a Gmail OAuth Flow.

    We are a confidential client (server-side secret) AND we use PKCE.
    Google recommends PKCE for all clients; the verifier is stored next to
    the CSRF state between /connect and /callback.
    """
    flow = Flow.from_client_config(
        GOOGLE_CLIENT_CONFIG,
        scopes=GMAIL_SCOPES,
        redirect_uri=REDIRECT_URI,
        autogenerate_code_verifier=generate_pkce,
    )
    if code_verifier:
        flow.code_verifier = code_verifier
    return flow


@app.get("/auth/gmail/connect")
def gmail_connect(user: dict = Depends(get_current_user)):
    """Start the Gmail OAuth flow: redirect the user to Google's consent screen."""
    flow = build_gmail_flow(generate_pkce=True)

    # Generate a random state (CSRF ticket) and remember it + PKCE verifier.
    state = secrets.token_urlsafe(32)
    db.save_oauth_state(state, user["id"], flow.code_verifier or "")

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
    # 1. Verify + consume the state (CSRF + TTL) in one statement.
    state_record = db.consume_oauth_state(state)
    if state_record is None:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    user_id = state_record["user_id"]

    # 2. Exchange the authorization code for tokens (PKCE verifier required).
    flow = build_gmail_flow(code_verifier=state_record.get("code_verifier"))
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


@app.post("/auth/gmail/disconnect")
def gmail_disconnect(user: dict = Depends(get_current_user)) -> dict:
    """Disconnect the current user's Gmail account.

    Revokes the grant at Google first (best-effort — see revoke_gmail_token),
    then deletes our copy of the tokens unconditionally. Order matters: once
    we've deleted our copy we have nothing left to revoke, so revoke must
    happen first, but its success is never a precondition for the local
    delete — "disconnect" must always work from the user's point of view.
    """
    connection = db.get_gmail_connection(user["id"])
    if connection is not None:
        revoke_gmail_token(connection["refresh_token"])
    db.delete_gmail_connection(user["id"])
    return {"connected": False, "email": None}


class ReplyRequest(BaseModel):
    body_html: str = Field(max_length=50_000)
    body_plain: str = Field(max_length=50_000)
    reply_all: bool = False


@app.post("/emails/{gmail_id}/reply")
def reply_to_email(
    gmail_id: str,
    body: ReplyRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Send a threaded reply to an email."""
    connection = db.get_gmail_connection(user["id"])
    if connection is None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "gmail_not_connected",
                "message": "No Gmail account connected. Please connect your Gmail first.",
            },
        )

    try:
        service = get_email_service(user["id"])
        # Re-fetch the original: we need its Message-ID, References, and
        # recipient headers to thread the reply correctly. Not stored, so we
        # ask Gmail each time — same on-demand principle as reading a body.
        original = fetch_email_body(service, gmail_id)

        raw = build_reply_message(
            original=original,
            my_email=connection["google_email"],
            body_plain=body.body_plain,
            body_html=sanitize_reply_html(body.body_html),
            reply_all=body.reply_all,
        )
        send_reply(service, raw, original.get("thread_id", ""))
    except GmailReauthError:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "gmail_reauth_required",
                "message": "Your Gmail connection expired. Please reconnect to continue.",
            },
        )

    return {"ok": True}
