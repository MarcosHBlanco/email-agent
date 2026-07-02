"""Authentication: password hashing, sessions, and token encryption."""

import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from cryptography.fernet import Fernet
from dotenv import load_dotenv

from email_agent import db

load_dotenv()  # ensure .env is loaded before we read FERNET_KEY

# Build the Fernet cipher once, from the key in .env.
_fernet = Fernet(os.environ["FERNET_KEY"])


def hash_password(plain_password: str) -> str:
    password_bytes = plain_password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    password_bytes = plain_password.encode("utf-8")
    hash_bytes = password_hash.encode("utf-")
    return bcrypt.checkpw(password_bytes, hash_bytes)


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token for safe storage. Returns an encrypted string."""
    return _fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(encrypted: str) -> str:
    """Decrypt a stored token back to its original value."""
    return _fernet.decrypt(encrypted.encode("utf-8")).decode("utf-8")


# How long a session stays valid before the user must log in again.
SESSION_DURATION_DAYS = 30


def create_session(user_id: int) -> str:
    """Create a new session for a user and return the session token."""
    token = secrets.token_urlsafe(32)  # the unguessable "ticket"
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=SESSION_DURATION_DAYS)

    with db.get_connection() as conn:
        conn.execute(
            """
            INSERT INTO sessions (id, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (token, user_id, now.isoformat(), expires.isoformat()),
        )
    return token


def get_session_user(token: str) -> int | None:
    """Given a session token, return the user_id it belongs to."""
    with db.get_connection() as conn:
        row = conn.execute(
            "SELECT user_id, expires_at FROM sessions WHERE id = ?",
            (token,),
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
        conn.execute("DELETE FROM sessions WHERE id = ?", (token,))
