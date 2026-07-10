"""SQLite storage for the email agent: runs, categorizations, and digests.

We store our ANALYSIS of emails (category, reason, summary) but never the
email content itself. Gmail remains the source of truth for email content.
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import time

from email_agent import config, crypto


@contextmanager
def get_connection():
    """Open a SQLite connection, yield it, and always close it.

    Using context manager to guarantee the connection closes even if an
    error occurs mid-operation.
    """
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _utc_now_iso() -> str:
    """UTC timestamp at second precision.

    Fixed width matters: we compare these as strings in SQL, and string
    ordering only equals chronological ordering when every timestamp has
    the same shape. isoformat() drops microseconds when they're zero, so
    we strip them explicitly rather than letting the width vary.
    """
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _local_day_bounds_utc(tz_name: str) -> tuple[str, str]:
    """Return (start, end) UTC timestamps for 'today' in the user's timezone.

    The database stores UTC — always. 'Today' is a question about the user's
    wall clock, so we compute their local midnight, then convert those two
    instants back to UTC to query with. Storage stays in one timezone;
    interpretation happens at the edge.
    """
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")  # unknown/garbage tz — never crash on user input

    now_local = datetime.now(tz)
    start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)

    def to_utc(dt: datetime) -> str:
        return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()

    return to_utc(start_local), to_utc(end_local)


def init_db() -> None:
    """Create the three tables if they don't already exist. Safe to call repeatedly."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                run_at TEXT NOT NULL,
                window_start TEXT NOT NULL,
                emails_processed INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS email_categorizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                run_id INTEGER NOT NULL,
                gmail_id TEXT NOT NULL,
                sender TEXT NOT NULL DEFAULT '',
                subject TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL,
                reason TEXT,
                summary TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                categorized_at TEXT NOT NULL,
                UNIQUE (user_id, gmail_id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (run_id) REFERENCES runs (id)
            )
            """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS digests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER NOT NULL,
                digest_text TEXT NOT NULL,
                digest_json TEXT NOT NULL,
                FOREIGN KEY (run_id) REFERENCES runs (id)
            )
            """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)

        # Migration: add preferences column to users if it doesn't exist yet.
        # (Existing users get NULL until they set preferences.)
        cols = conn.execute("PRAGMA table_info(users)").fetchall()
        if not any(c["name"] == "preferences" for c in cols):
            conn.execute("ALTER TABLE users ADD COLUMN preferences TEXT")

        # Migration: add timezone column (IANA name, e.g. "America/Vancouver").
        # The server needs this to know when a user's day starts — including
        # for scheduled runs, where no browser is present to tell us.
        if not any(c["name"] == "timezone" for c in cols):
            conn.execute("ALTER TABLE users ADD COLUMN timezone TEXT")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS gmail_connections (
                user_id INTEGER PRIMARY KEY,
                google_email TEXT NOT NULL,
                access_token_encrypted TEXT NOT NULL,
                refresh_token_encrypted TEXT NOT NULL,
                token_expiry TEXT NOT NULL,
                connected_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """)


def record_run(user_id: int, window_start: str, emails_processed: int) -> int:
    """Insert a row into runs and return its new id."""
    run_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO runs (user_id, run_at, window_start, emails_processed) VALUES (?, ?, ?, ?)",
            (user_id, run_at, window_start, emails_processed),
        )
        assert cursor.lastrowid is not None
        return cursor.lastrowid


def save_categorization(
    user_id: int,
    run_id: int,
    gmail_id: str,
    sender: str,
    subject: str,
    category: str,
    reason: str,
    summary: str,
) -> None:
    """Insert one email's categorization. One row per (user, email), forever.

    ON CONFLICT DO NOTHING: if this email was already categorized, leave the
    existing row alone. That preserves is_read (a re-run must never mark a
    read email unread) and its original categorized_at (so it stays in the
    day it first appeared).
    """
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO email_categorizations
                (user_id, run_id, gmail_id, sender, subject,
                 category, reason, summary, is_read, categorized_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(user_id, gmail_id) DO NOTHING
            """,
            (
                user_id,
                run_id,
                gmail_id,
                sender,
                subject,
                category,
                reason,
                summary,
                _utc_now_iso(),
            ),
        )


def get_known_gmail_ids(user_id: int, gmail_ids: list[str]) -> set[str]:
    """Of the given Gmail message ids, return the ones we've already categorized.

    Called BEFORE the categorization loop so we never pay Claude to re-analyze
    an email we've already seen. The UNIQUE constraint is the safety net; this
    is the thing that actually saves the API calls.
    """
    if not gmail_ids:
        return set()

    # One '?' per id. The placeholders are generated from the list's LENGTH,
    # never from its contents — so this is not SQL injection; the values still
    # go through parameter binding below.
    placeholders = ",".join("?" for _ in gmail_ids)
    with get_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT gmail_id FROM email_categorizations
            WHERE user_id = ? AND gmail_id IN ({placeholders})
            """,
            (user_id, *gmail_ids),
        ).fetchall()
    return {row["gmail_id"] for row in rows}


def save_digest(run_id: int, digest_text: str, digest_data: dict) -> None:
    """Store a digest snapshot: both the human-readable text and structured JSON.

    digest_text  -> formatted plain text (terminal / human record)
    digest_data  -> the structured dict the frontend needs; stored as a JSON string
    """
    digest_json = json.dumps(digest_data)
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO digests (run_id, digest_text, digest_json) VALUES (?, ?, ?)",
            (run_id, digest_text, digest_json),
        )


def get_last_run_time(user_id: int) -> str | None:
    """Return the run_at of the user's most recent run, or None if none yet."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT run_at FROM runs WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()
        return row["run_at"] if row else None


def get_todays_digest(user_id: int) -> dict | None:
    """Build today's digest by aggregating every email categorized today.

    This is the Option-B read model: the digest is not a stored snapshot, it's
    a question we ask of the per-email rows. Multiple runs in one day therefore
    accumulate for free — each run just adds rows.
    """
    start_utc, end_utc = _local_day_bounds_utc(get_user_timezone(user_id))

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT gmail_id, sender, subject, category, reason, summary, is_read
            FROM email_categorizations
            WHERE user_id = ?
              AND categorized_at >= ?
              AND categorized_at <  ?
            ORDER BY categorized_at DESC, id DESC
            """,
            (user_id, start_utc, end_utc),
        ).fetchall()

    if not rows:
        return None

    buckets: dict[str, list[dict]] = {"IMPORTANT": [], "ROUTINE": [], "JUNK": []}
    for row in rows:
        buckets[row["category"]].append(
            {
                "gmail_id": row["gmail_id"],
                "sender": row["sender"],
                "subject": row["subject"],
                "summary": row["summary"],
                "reason": row["reason"],
                "is_read": bool(row["is_read"]),
            }
        )

    return {
        "total": len(rows),
        "generated_at": _utc_now_iso(),
        "buckets": buckets,
    }


def mark_email_read(user_id: int, gmail_id: str) -> bool:
    """Mark one email read. Returns False if the user doesn't own it.

    Scoped by user_id, not just gmail_id — a user must never be able to touch
    another user's row by guessing an id.
    """
    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE email_categorizations
            SET is_read = 1
            WHERE user_id = ? AND gmail_id = ?
            """,
            (user_id, gmail_id),
        )
        return cursor.rowcount > 0


def get_user_timezone(user_id: int) -> str:
    """Return the user's IANA timezone, defaulting to UTC if unset."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT timezone FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if row is None or not row["timezone"]:
        return "UTC"
    return row["timezone"]


def get_daily_analytics(user_id: int) -> list[dict]:
    """Aggregate a user's categorizations by their LOCAL calendar day.

    Previously this grouped on date(run_at), which is the UTC date — so for a
    user in Vancouver (UTC-7/-8), anything processed after 4-5pm local landed
    on the next day's square. We now convert each timestamp into the user's
    timezone before deciding which day it belongs to.

    No COUNT(DISTINCT) needed: UNIQUE(user_id, gmail_id) makes duplicate rows
    impossible, so the invariant the DISTINCT used to defend is now enforced
    by the schema itself.
    """
    try:
        tz = ZoneInfo(get_user_timezone(user_id))
    except Exception:
        tz = ZoneInfo("UTC")

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT category, categorized_at
            FROM email_categorizations
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchall()

    by_day: dict[str, dict] = {}
    for row in rows:
        local_day = (
            datetime.fromisoformat(row["categorized_at"])
            .astimezone(tz)
            .date()
            .isoformat()
        )
        if local_day not in by_day:
            by_day[local_day] = {
                "date": local_day,
                "IMPORTANT": 0,
                "ROUTINE": 0,
                "JUNK": 0,
                "total": 0,
            }
        by_day[local_day][row["category"]] += 1
        by_day[local_day]["total"] += 1

    return sorted(by_day.values(), key=lambda d: d["date"])


def create_user(email: str, password_hash: str, tz: str = "UTC") -> int:
    """Insert a new user and return their id. Raises if email already exists."""
    created_at = _utc_now_iso()
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, created_at, timezone) VALUES (?, ?, ?, ?)",
            (email, password_hash, created_at, tz),
        )
        assert cursor.lastrowid is not None
        return cursor.lastrowid


def get_user_by_email(email: str) -> dict | None:
    """Find a user by email. Returns a dict with id, email, password_hash — or None."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    """Find a user by id. Returns a dict with id, email — or None."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, email FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None


def save_user_preferences(user_id: int, preferences: dict) -> None:
    """Store a user's categorization preferences as JSON.

    Preferences is a dict (profession, interests, example senders/keywords,
    and free-text important/routine/junk examples). Serialized to JSON text.
    """
    preferences_json = json.dumps(preferences)
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET preferences = ? WHERE id = ?",
            (preferences_json, user_id),
        )


def get_user_preferences(user_id: int) -> dict | None:
    """Load a user's categorization preferences, or None if not set yet."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT preferences FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if row is None or row["preferences"] is None:
        return None
    return json.loads(row["preferences"])


def save_gmail_connection(
    user_id: int,
    google_email: str,
    access_token: str,
    refresh_token: str,
    token_expiry: str,
) -> None:
    """Store (or replace) a user's Gmail connection with encrypted tokens.

    Takes PLAINTEXT tokens and encrypts them here — the db layer is the single
    guardian ensuring tokens are never stored unencrypted.
    """
    access_encrypted = crypto.encrypt_token(access_token)
    refresh_encrypted = crypto.encrypt_token(refresh_token)
    connected_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO gmail_connections
                (user_id, google_email, access_token_encrypted,
                 refresh_token_encrypted, token_expiry, connected_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                google_email,
                access_encrypted,
                refresh_encrypted,
                token_expiry,
                connected_at,
            ),
        )


def get_gmail_connection(user_id: int) -> dict | None:
    """Load a user's Gmail connection with tokens DECRYPTED for use.

    Returns a dict with plaintext tokens ready to use, or None if the user
    hasn't connected Gmail.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM gmail_connections WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return {
        "user_id": row["user_id"],
        "google_email": row["google_email"],
        "access_token": crypto.decrypt_token(row["access_token_encrypted"]),
        "refresh_token": crypto.decrypt_token(row["refresh_token_encrypted"]),
        "token_expiry": row["token_expiry"],
        "connected_at": row["connected_at"],
    }


def save_oauth_state(state: str, user_id: str) -> None:
    """Store a pending OAuth state (CSRF ticket) for a user."""
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO oauth_states (state, user_id, created_at) VALUES (?, ?, ?)",
            (state, user_id, created_at),
        )


def get_oauth_state(state: str) -> dict | None:
    """Look up a pending OAuth state. Returns {user_id, created_at} or None"""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT user_id, created_at FROM oauth_states WHERE state =?",
            (state,),
        ).fetchone()
        return dict(row) if row else None


def delete_oauth_state(state: str) -> None:
    """Delete a used OAuth state (one-time use)."""
    with get_connection() as conn:
        conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
