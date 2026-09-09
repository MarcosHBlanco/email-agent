"""Authentication: password hashing and session management."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt

from email_agent import config, db


def normalize_email(email: str) -> str:
    """Canonical form for storage and lookup. Avoids A@x.com vs a@x.com duplicates."""
    return email.strip().lower()


def _password_too_long(plain_password: str) -> bool:
    return len(plain_password.encode("utf-8")) > config.BCRYPT_MAX_PASSWORD_BYTES


def hash_password(plain_password: str) -> str:
    if _password_too_long(plain_password):
        raise ValueError("Password exceeds bcrypt's 72-byte limit")
    password_bytes = plain_password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    if _password_too_long(plain_password):
        return False
    password_bytes = plain_password.encode("utf-8")
    hash_bytes = password_hash.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hash_bytes)


# How long a session stays valid before the user must log in again.
SESSION_DURATION_DAYS = 30


def hash_session_token(token: str) -> str:
    """Store only the hash. The cookie holds the raw token (like a password)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id: int) -> str:
    """Create a new session for a user and return the raw session token."""
    token = secrets.token_urlsafe(32)  # the unguessable "ticket"
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SESSION_DURATION_DAYS)

    with db.get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sessions (id, user_id, created_at, expires_at)
            VALUES (%s, %s, %s, %s)
            """,
            (hash_session_token(token), user_id, now.isoformat(), expires.isoformat()),
        )
    return token


def get_session_user(token: str) -> int | None:
    """Given a raw session token from the cookie, return the user_id it belongs to."""
    token_hash = hash_session_token(token)
    with db.get_connection() as conn:
        row = conn.execute(
            "SELECT user_id, expires_at FROM sessions WHERE id = %s",
            (token_hash,),
        ).fetchone()

    if row is None:
        return None  # no such session — invalid ticket

    expires = datetime.fromisoformat(row["expires_at"])
    if datetime.now(timezone.utc) > expires:
        return None  # session expired — ticket no longer valid

    return row["user_id"]


def delete_session(token: str) -> None:
    """Delete a session (logout). Safe to call even if it doesn't exist."""
    with db.get_connection() as conn:
        conn.execute(
            "DELETE FROM sessions WHERE id = %s",
            (hash_session_token(token),),
        )
