"""SQLite storage for the email agent: runs, categorizations, and digests.

We store our ANALYSIS of emails (category, reason, summary) but never the
email content itself. Gmail remains the source of truth for email content.
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from email_agent import config


@contextmanager
def get_connection():
    """Open a SQLite connection, yield it, and always close it.

    Using a context manager guarantees the connection closes even if an
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
                FOREIGN KEY (run_id) REFERENCES runs (id)
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


def save_digest(run_id: int, digest_text: str) -> None:
    """Insert the formatted digest text for a run."""
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO digests (run_id, digest_text) VALUES (?, ?)",
            (run_id, digest_text),
        )


def get_last_run_time() -> str | None:
    """Return the run_at timestamp of the most recent run, or None if no runs yet."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT run_at FROM runs ORDER BY id DESC LIMIT 1"
        ).fetchone()
        return row["run_at"] if row else None
