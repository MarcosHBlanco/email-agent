"""Tests for summarizer.run_digest's per-email fault isolation.

Before the fix this file tests for, a single email that failed inside the
ThreadPoolExecutor loop (categorize_email raising — e.g. a Claude timeout or
rate limit) would re-raise out of future.result() and unwind the whole
_run_digest_locked() call before any db.save_categorization() had run. A
batch of 3 emails with 1 failure produced a digest of NOTHING, and the 2
emails that succeeded (and were already paid for, in Claude API calls) were
silently thrown away.
"""

from unittest.mock import patch

from email_agent import db
from email_agent.categorizer import CategorizationResult
from email_agent.summarizer import run_digest


def _fake_email(gmail_id: str) -> dict:
    return {
        "id": gmail_id,
        "sender": "sender@test.com",
        "subject": f"subject for {gmail_id}",
        "snippet": "hello",
        "received_at": None,
    }


def test_one_failed_email_does_not_lose_the_others(temp_db):
    """A batch of 3 emails where 1 fails must still save the other 2."""
    user_id = db.create_user("batch@test.com", "hash")
    emails = [_fake_email("good-1"), _fake_email("bad"), _fake_email("good-2")]

    def fake_categorize(email, preferences=None):
        if email["id"] == "bad":
            raise RuntimeError("simulated Claude timeout")
        return CategorizationResult(category="IMPORTANT", reason="r", summary="s")

    with (
        patch("email_agent.summarizer.get_email_service", return_value=object()),
        patch("email_agent.summarizer.fetch_recent_emails", return_value=emails),
        patch(
            "email_agent.summarizer.categorize_email", side_effect=fake_categorize
        ),
        patch("email_agent.summarizer.sentry_sdk.capture_exception") as mock_capture,
    ):
        digest = run_digest(user_id)

    assert digest is not None
    # 2 succeeded, 1 failed — total must reflect what actually got
    # categorized and saved, not the 3 that were merely attempted.
    assert digest["total"] == 2
    assert len(digest["buckets"]["IMPORTANT"]) == 2

    # The failure must have been reported, not swallowed silently.
    mock_capture.assert_called_once()

    # The failed email must NOT be marked "known" — so the next run treats
    # it as new again and retries it, instead of it vanishing forever.
    known = db.get_known_gmail_ids(user_id, ["good-1", "bad", "good-2"])
    assert known == {"good-1", "good-2"}


def test_all_emails_succeeding_is_unaffected(temp_db):
    """Sanity check: with no failures, behavior is exactly as before."""
    user_id = db.create_user("allgood@test.com", "hash")
    emails = [_fake_email("e1"), _fake_email("e2")]

    def fake_categorize(email, preferences=None):
        return CategorizationResult(category="ROUTINE", reason="r", summary="s")

    with (
        patch("email_agent.summarizer.get_email_service", return_value=object()),
        patch("email_agent.summarizer.fetch_recent_emails", return_value=emails),
        patch(
            "email_agent.summarizer.categorize_email", side_effect=fake_categorize
        ),
        patch("email_agent.summarizer.sentry_sdk.capture_exception") as mock_capture,
    ):
        digest = run_digest(user_id)

    assert digest is not None
    assert digest["total"] == 2
    assert len(digest["buckets"]["ROUTINE"]) == 2
    mock_capture.assert_not_called()
