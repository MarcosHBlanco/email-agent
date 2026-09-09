"""Tests that users can only see their own data (no cross-user leakage)."""

from email_agent import db, crypto


def _insert_digest_for_user(user_id: int, total: int) -> None:
    """Helper: create a run + digest + categorizations for a user.

    Inserts directly (no Gmail/Claude) so tests are fast and dependency-free.
    Includes categorizations because get_todays_digest / analytics read those.
    """
    run_id = db.record_run(
        user_id=user_id,
        window_start="2026-01-01T00:00:00+00:00",
        emails_processed=total,
    )
    for i in range(total):
        db.save_categorization(
            user_id=user_id,
            run_id=run_id,
            gmail_id=f"msg-{user_id}-{i}",
            sender="sender@test.com",
            subject="subject",
            category="IMPORTANT",
            reason="test",
            summary="test",
            received_at=None,
        )
    digest_data = {
        "total": total,
        "generated_at": "2026-01-01T00:00:00+00:00",
        "buckets": {},
    }
    db.save_digest(run_id=run_id, digest_text="text", digest_data=digest_data)


def test_user_sees_only_their_own_digest(temp_db):
    """User A's today's digest must be A's, and B's must be B's — never crossed."""
    user_a = db.create_user("a@test.com", "hashA")
    user_b = db.create_user("b@test.com", "hashB")
    _insert_digest_for_user(user_a, total=10)
    _insert_digest_for_user(user_b, total=99)

    digest_a = db.get_todays_digest(user_a)
    digest_b = db.get_todays_digest(user_b)

    assert digest_a is not None
    assert digest_b is not None
    assert digest_a["total"] == 10
    assert digest_b["total"] == 99


def test_user_with_no_data_sees_nothing(temp_db):
    """A user who never processed sees None, even when other users have data."""
    user_a = db.create_user("a@test.com", "hashA")
    user_b = db.create_user("b@test.com", "hashB")
    _insert_digest_for_user(user_a, total=10)

    assert db.get_todays_digest(user_b) is None


def test_analytics_are_isolated_per_user(temp_db):
    """Each user's analytics reflect only their own runs."""
    user_a = db.create_user("a@test.com", "hashA")
    user_b = db.create_user("b@test.com", "hashB")
    _insert_digest_for_user(user_a, total=10)
    _insert_digest_for_user(user_b, total=99)

    analytics_a = db.get_daily_analytics(user_a)
    analytics_b = db.get_daily_analytics(user_b)

    total_a = sum(day["total"] for day in analytics_a)
    total_b = sum(day["total"] for day in analytics_b)
    assert total_a == 10
    assert total_b == 99


def test_gmail_connection_round_trips(temp_db):
    """Saving then loading a Gmail connection returns the original tokens."""
    user_id = db.create_user("gmailtest@test.com", "hash")
    db.save_gmail_connection(
        user_id=user_id,
        google_email="connected@gmail.com",
        access_token="access-abc",
        refresh_token="refresh-xyz",
        token_expiry="2026-01-01T00:00:00+00:00",
    )

    conn = db.get_gmail_connection(user_id)
    assert conn is not None
    assert conn["google_email"] == "connected@gmail.com"
    assert conn["access_token"] == "access-abc"
    assert conn["refresh_token"] == "refresh-xyz"


def test_gmail_tokens_are_encrypted_at_rest(temp_db):
    """The raw stored token must NOT be the plaintext — it must be encrypted."""
    user_id = db.create_user("enc@test.com", "hash")
    db.save_gmail_connection(
        user_id=user_id,
        google_email="e@gmail.com",
        access_token="my-plaintext-token",
        refresh_token="refresh-xyz",
        token_expiry="2026-01-01T00:00:00+00:00",
    )

    with db.get_connection() as c:
        raw = c.execute(
            "SELECT access_token_encrypted FROM gmail_connections WHERE user_id = %s",
            (user_id,),
        ).fetchone()

    assert raw["access_token_encrypted"] != "my-plaintext-token"
    assert crypto.decrypt_token(raw["access_token_encrypted"]) == "my-plaintext-token"


def test_reconnect_replaces_connection(temp_db):
    """Re-saving for the same user replaces the old connection."""
    user_id = db.create_user("recon@test.com", "hash")
    db.save_gmail_connection(
        user_id,
        "old@gmail.com",
        "old-access",
        "old-refresh",
        "2026-01-01T00:00:00+00:00",
    )
    db.save_gmail_connection(
        user_id,
        "new@gmail.com",
        "new-access",
        "new-refresh",
        "2026-02-01T00:00:00+00:00",
    )

    conn = db.get_gmail_connection(user_id)
    assert conn is not None
    assert conn["google_email"] == "new@gmail.com"
    assert conn["access_token"] == "new-access"

    with db.get_connection() as c:
        count = c.execute(
            "SELECT COUNT(*) AS n FROM gmail_connections WHERE user_id = %s",
            (user_id,),
        ).fetchone()["n"]
    assert count == 1


def test_digest_lock_is_exclusive(temp_db):
    user_id = db.create_user("lock@test.com", "hash")
    assert db.try_acquire_digest_lock(user_id) is True
    assert db.try_acquire_digest_lock(user_id) is False
    db.release_digest_lock(user_id)
    assert db.try_acquire_digest_lock(user_id) is True
    db.release_digest_lock(user_id)


def test_oauth_state_consumed_once(temp_db):
    user_id = db.create_user("oauth@test.com", "hash")
    db.save_oauth_state("ticket", user_id, "verifier-abc")
    first = db.consume_oauth_state("ticket")
    assert first is not None
    assert first["user_id"] == user_id
    assert first["code_verifier"] == "verifier-abc"
    assert db.consume_oauth_state("ticket") is None
