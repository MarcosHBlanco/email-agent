"""SQLite storage for the email agent: runs, categorizations, and digests.

We store our ANALYSIS of emails (category, reason, summary) but never the
email content itself. Gmail remains the source of truth for email content.
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from email_agent import config


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


def init_db() -> None:
    """Create the three tables if they don't already exist. Safe to call repeatedly."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at TEXT NOT NULL,
                window_start TEXT NOT NULL,
                emails_processed INTEGER NOT NULL
            )
            """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS email_categorizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id INTEGER NOT NULL,
                gmail_id TEXT NOT NULL,
                category TEXT NOT NULL,
                reason TEXT,
                summary TEXT,
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

        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """)


def record_run(window_start: str, emails_processed: int) -> int:
    """Insert a row into runs and return its new id."""
    run_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO runs (run_at, window_start, emails_processed) VALUES (?, ?, ?)",
            (run_at, window_start, emails_processed),
        )
        assert cursor.lastrowid is not None
        return cursor.lastrowid


def save_categorization(
    run_id: int, gmail_id: str, category: str, reason: str, summary: str
) -> None:
    """Insert one email's categorization result."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO email_categorizations
                (run_id, gmail_id, category, reason, summary)
            VALUES (?, ?, ?, ?, ?)
            """,
            (run_id, gmail_id, category, reason, summary),
        )


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


def get_last_run_time() -> str | None:
    """Return the run_at timestamp of the most recent run, or None if no runs yet."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT run_at FROM runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        return row["run_at"] if row else None


def get_latest_digest() -> dict | None:
    """Return the most recent stored digest as structured data, or None if none exist.

    Reads the stored JSON string and parses it back into a dict. This is the
    READ path: fast, no Claude calls, just a database lookup.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT digest_json FROM digests ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if row is None:
            return None
        return json.loads(row["digest_json"])


def get_daily_analytics() -> list[dict]:
    """Aggregate categorizations by calendar day and category.

    Returns one entry per day that had activity, with distinct-email counts
    per category. Distinct because the same email re-categorized in multiple
    runs on the same day should count once, otherwise it inflates the numbers.

    Shape: [{"date": "2026-06-09", "IMPORTANT": 3, "ROUTINE": 1,
             "JUNK": 8, "total": 12}, ...] ordered oldest to newest.
    """
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT
                date(r.run_at) AS day,
                ec.category AS category,
                COUNT(DISTINCT ec.gmail_id) AS count
            FROM email_categorizations ec
            JOIN runs r ON ec.run_id = r.id
            GROUP BY day, ec.category
            ORDER BY day ASC
            """).fetchall()

    # Reshape flat (day, category, count) rows into one dict per day.
    by_day: dict[str, dict] = {}
    for row in rows:
        day = row["day"]
        if day not in by_day:
            by_day[day] = {
                "date": day,
                "IMPORTANT": 0,
                "ROUTINE": 0,
                "JUNK": 0,
                "total": 0,
            }
        by_day[day][row["category"]] = row["count"]
        by_day[day]["total"] += row["count"]

    return list(by_day.values())


def create_user(email: str, password_hash: str) -> int:
    """Insert a new user and return their id. Raises if email already exists."""
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (email, password_hash, created_at),
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
