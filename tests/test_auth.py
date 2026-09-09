"""Tests for the auth module: password hashing and sessions."""

import pytest

from email_agent import auth, config, db


def test_hash_and_verify_correct_password():
    """A password should verify against its own hash."""
    password = "mysecretpassword"
    hashed = auth.hash_password(password)
    assert auth.verify_password(password, hashed) is True


def test_verify_rejects_wrong_password():
    """A different password should NOT verify against the hash."""
    hashed = auth.hash_password("correctpassword")
    assert auth.verify_password("wrongpassword", hashed) is False


def test_hash_rejects_bcrypt_overflow():
    """bcrypt would silently truncate — we refuse instead."""
    too_long = "a" * (config.BCRYPT_MAX_PASSWORD_BYTES + 1)
    with pytest.raises(ValueError):
        auth.hash_password(too_long)
    assert auth.verify_password(too_long, auth.hash_password("ok-password")) is False


def test_normalize_email_lowercases_and_strips():
    assert auth.normalize_email("  A@X.com ") == "a@x.com"


def test_create_and_get_session(temp_db):
    """Creating a session, then looking it up, returns the right user."""
    user_id = db.create_user("session@test.com", "fakehash")
    token = auth.create_session(user_id)
    assert auth.get_session_user(token) == user_id


def test_session_token_is_hashed_at_rest(temp_db):
    """A DB dump must not contain the cookie value."""
    user_id = db.create_user("hashsess@test.com", "fakehash")
    token = auth.create_session(user_id)
    with db.get_connection() as conn:
        row = conn.execute("SELECT id FROM sessions").fetchone()
    assert row is not None
    assert row["id"] != token
    assert row["id"] == auth.hash_session_token(token)


def test_delete_session_revokes_it(temp_db):
    """A deleted session should no longer resolve to a user."""
    user_id = db.create_user("revoke@test.com", "fakehash")
    token = auth.create_session(user_id)
    assert auth.get_session_user(token) == user_id
    auth.delete_session(token)
    assert auth.get_session_user(token) is None


def test_invalid_token_returns_none(temp_db):
    """A token that was never created should resolve to nobody."""
    assert auth.get_session_user("this-token-does-not-exist") is None
