"""Shared pytest fixtures for the test suite."""

import os

import pytest
from dotenv import load_dotenv

from email_agent import db

load_dotenv()

# NEVER point this at the production DATABASE_URL. Tests truncate tables.
# Export TEST_DATABASE_URL to a disposable Postgres database to run them.
_TABLES = (
    "digest_locks",
    "oauth_states",
    "gmail_connections",
    "sessions",
    "digests",
    "email_categorizations",
    "runs",
    "users",
)


@pytest.fixture
def temp_db(monkeypatch):
    """Give each test a fresh schema on TEST_DATABASE_URL only."""
    test_url = os.environ.get("TEST_DATABASE_URL")
    if not test_url:
        pytest.skip("Set TEST_DATABASE_URL to a disposable Postgres DB to run these tests")
    if not os.environ.get("FERNET_KEY"):
        pytest.skip("FERNET_KEY is required for database tests")

    monkeypatch.setenv("DATABASE_URL", test_url)
    db.close_pool()
    db.init_pool()
    db.init_db()

    with db.get_connection() as conn:
        conn.execute("TRUNCATE TABLE " + ", ".join(_TABLES) + " CASCADE")

    yield

    with db.get_connection() as conn:
        conn.execute("TRUNCATE TABLE " + ", ".join(_TABLES) + " CASCADE")
    db.close_pool()
