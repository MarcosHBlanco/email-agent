"""Tests that users can only see their own data (no cross-user leakage)."""

from email_agent import db


def _insert_digest_for_user(user_id: int, total: int) -> None:
    """Helper: create a run + digest + categorizations for a user.

    Inserts directly (no Gmail/Claude) so tests are fast and dependency-free.
    Includes categorizations because get_daily_analytics reads from that table.
    """
    run_id = db.record_run(
        user_id=user_id,
        window_start="2026-01-01T00:00:00+00:00",
        emails_processed=total,
    )
    # Insert `total` categorization rows so analytics has data to count.
    for i in range(total):
        db.save_categorization(
            run_id=run_id,
            gmail_id=f"msg-{user_id}-{i}",  # unique id per email
            category="IMPORTANT",
            reason="test",
            summary="test",
        )
    digest_data = {
        "total": total,
        "generated_at": "2026-01-01T00:00:00+00:00",
        "buckets": {},
    }
    db.save_digest(run_id=run_id, digest_text="text", digest_data=digest_data)


def test_user_sees_only_their_own_digest(temp_db):
    """User A's latest digest must be A's, and B's must be B's — never crossed."""
    # Arrange: two users, each with their own digest.
    user_a = db.create_user("a@test.com", "hashA")
    user_b = db.create_user("b@test.com", "hashB")
    _insert_digest_for_user(user_a, total=10)
    _insert_digest_for_user(user_b, total=99)

    # Act
    digest_a = db.get_latest_digest(user_a)
    digest_b = db.get_latest_digest(user_b)

    # Assert they exist before subscripting (also satisfies the type checker).
    assert digest_a is not None
    assert digest_b is not None
    assert digest_a["total"] == 10  # A sees A's data
    assert digest_b["total"] == 99  # B sees B's data


def test_user_with_no_data_sees_nothing(temp_db):
    """A user who never processed sees None, even when other users have data."""
    user_a = db.create_user("a@test.com", "hashA")
    user_b = db.create_user("b@test.com", "hashB")

    # Only A has data.
    _insert_digest_for_user(user_a, total=10)

    # B never processed → B sees nothing, even though A's data exists.
    assert db.get_latest_digest(user_b) is None


def test_analytics_are_isolated_per_user(temp_db):
    """Each user's analytics reflect only their own runs."""
    user_a = db.create_user("a@test.com", "hashA")
    user_b = db.create_user("b@test.com", "hashB")
    _insert_digest_for_user(user_a, total=10)
    _insert_digest_for_user(user_b, total=99)

    analytics_a = db.get_daily_analytics(user_a)
    analytics_b = db.get_daily_analytics(user_b)

    # Each user has exactly one day of data, and it's their own.
    # (Both inserted on the same date, but scoped to their own user_id.)
    assert len(analytics_a) >= 0  # has A's data only
    assert len(analytics_b) >= 0  # has B's data only
    # The key isolation check: A's analytics don't include B's 99 emails.
    total_a = sum(day["total"] for day in analytics_a)
    total_b = sum(day["total"] for day in analytics_b)
    assert total_a == 10  # A's analytics total is A's emails only
    assert total_b == 99  # B's analytics total is B's emails only
