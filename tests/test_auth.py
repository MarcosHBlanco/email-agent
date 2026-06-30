"""Tests for the auth module: password hashing and sessions."""

from email_agent import auth, db


def test_hash_and_verify_correct_password():
    """A password should verify against its own hash."""
    password = "mysecretpassword"
    hashed = auth.hash_password(password)
    assert auth.verify_password(password, hashed) is True


def test_verify_rejects_wrong_password():
    """A different password should NOT verify against the hash."""
    hashed = auth.hash_password("correctpassword")
    assert auth.verify_password("wrongpassword", hashed) is False


def test_create_and_get_session(temp_db):
    """Creating a session, then looking it up, returns the right user."""
    # Arrange: make a user to attach a session to.
    user_id = db.create_user("session@test.com", "fakehash")

    # Act: create a session for that user.
    token = auth.create_session(user_id)

    # Assert: looking up the token returns that user's id.
    assert auth.get_session_user(token) == user_id


def test_delete_session_revokes_it(temp_db):
    """A deleted session should no longer resolve to a user."""
    user_id = db.create_user("revoke@test.com", "fakehash")
    token = auth.create_session(user_id)

    # Confirm it works first...
    assert auth.get_session_user(token) == user_id

    # ...then delete it...
    auth.delete_session(token)

    # ...and confirm it's gone.
    assert auth.get_session_user(token) is None


def test_invalid_token_returns_none(temp_db):
    """A token that was never created should resolve to nobody."""
    assert auth.get_session_user("this-token-does-not-exist") is None
