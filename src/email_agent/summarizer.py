"""Orchestrate a full digest run: fetch, categorize, store, and return data.

This is the conductor that ties together gmail_client, categorizer, and db.
It returns structured data; presentation (terminal text, web JSON) is the
caller's responsibility.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

from email_agent import config, db
from email_agent.categorizer import CategorizationResult, categorize_email
from email_agent.gmail_client import get_email_service, fetch_recent_emails


class DigestInProgressError(Exception):
    """Another digest is already running for this user."""


def _hours_since_last_run(user_id: int) -> int:
    """
    If there was a previous run, look back to just after it. Otherwise,
    fall back to the default window (first run looks back 24 hours).
    """
    last_run = db.get_last_run_time(user_id)
    if last_run is None:
        return config.DEFAULT_HOURS_BACK

    last_run_time = datetime.fromisoformat(last_run)
    now = datetime.now(timezone.utc)
    elapsed = now - last_run_time
    hours = int(elapsed.total_seconds() / 3600) + 1  # +1 for a small overlap
    return max(hours, 1)


def run_digest(user_id: int) -> dict | None:
    """Run one digest cycle; return TODAY'S accumulated digest (all runs).

    Takes a per-user lock so a double-click or overlapping cron cannot pay
    Claude twice for the same window. UNIQUE(gmail_id) is the DB safety net;
    the lock is what actually saves the API calls.
    """
    if not db.try_acquire_digest_lock(user_id):
        raise DigestInProgressError(f"Digest already running for user {user_id}")

    try:
        return _run_digest_locked(user_id)
    finally:
        db.release_digest_lock(user_id)


def _run_digest_locked(user_id: int) -> dict | None:
    hours_back = _hours_since_last_run(user_id)
    window_start = (
        datetime.now(timezone.utc) - timedelta(hours=hours_back)
    ).isoformat()

    service = get_email_service(user_id)
    preferences = db.get_user_preferences(user_id)
    emails = fetch_recent_emails(
        service, hours_back=hours_back, max_results=config.MAX_EMAILS_PER_RUN
    )

    # Drop anything we've already categorized BEFORE paying Claude for it.
    # Lookback windows overlap by design (+1 hour), so this fires routinely.
    known = db.get_known_gmail_ids(user_id, [e.get("id", "") for e in emails])
    new_emails = [e for e in emails if e.get("id", "") not in known]

    run_id = db.record_run(
        user_id=user_id, window_start=window_start, emails_processed=len(new_emails)
    )

    run_buckets: dict[str, list[dict]] = {"IMPORTANT": [], "ROUTINE": [], "JUNK": []}

    categorized: list[tuple[dict, CategorizationResult]] = []
    if new_emails:
        workers = min(config.CATEGORIZE_WORKERS, len(new_emails))
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(categorize_email, email, preferences): email
                for email in new_emails
            }
            for future in as_completed(futures):
                email = futures[future]
                categorized.append((email, future.result()))

    for email, result in categorized:
        db.save_categorization(
            user_id=user_id,
            run_id=run_id,
            gmail_id=email.get("id", ""),
            sender=email.get("sender", "(unknown sender)"),
            subject=email.get("subject", "(no subject)"),
            category=result.category,
            reason=result.reason,
            summary=result.summary,
            received_at=email.get("received_at"),
        )
        run_buckets[result.category].append(
            {
                "gmail_id": email.get("id", ""),
                "sender": email.get("sender", "(unknown sender)"),
                "subject": email.get("subject", "(no subject)"),
                "summary": result.summary,
                "reason": result.reason,
            }
        )

    run_data = {
        "total": len(new_emails),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "buckets": run_buckets,
    }
    db.save_digest(
        run_id=run_id,
        digest_text=format_digest_text(run_data),
        digest_data=run_data,
    )

    return db.get_todays_digest(user_id)


def format_digest_text(digest_data: dict) -> str:
    """Format structured digest data into readable text (for terminal/storage).

    This is a presentation helper. The web frontend will format the same
    data differently; this one produces plain text.
    """
    total = digest_data["total"]
    buckets = digest_data["buckets"]

    lines = []
    lines.append("=" * 60)
    lines.append(f"EMAIL DIGEST  -  {total} emails processed")
    lines.append("=" * 60)

    for category in ("IMPORTANT", "ROUTINE", "JUNK"):
        items = buckets[category]
        lines.append("")
        lines.append(f"{category}  ({len(items)})")
        lines.append("-" * 60)
        if not items:
            lines.append("  (none)")
        else:
            for item in items:
                lines.append(f"  - {item['subject']}")
                if item["summary"]:
                    lines.append(f"      {item['summary']}")

    lines.append("")
    return "\n".join(lines)
