"""Orchestrate a full digest run: fetch, categorize, store, and format.

This is the conductor that ties together gmail_client, categorizer, and db.
"""

from datetime import datetime, timedelta, timezone

from email_agent import config, db
from email_agent.categorizer import categorize_email
from email_agent.gmail_client import get_email_service, fetch_recent_emails


def _hours_since_last_run() -> int:
    """How many hours back should this run look?

    If there was a previous run, look back to just after it. Otherwise,
    fall back to the default window (first run looks back 24 hours).
    """
    last_run = db.get_last_run_time()
    if last_run is None:
        return config.DEFAULT_HOURS_BACK

    last_run_time = datetime.fromisoformat(last_run)
    now = datetime.now(timezone.utc)
    elapsed = now - last_run_time
    hours = int(elapsed.total_seconds() / 3600) + 1  # +1 for a small overlap
    return max(hours, 1)


def run_digest() -> str:
    """Run one full digest cycle and return the formatted digest text."""
    db.init_db()

    hours_back = _hours_since_last_run()
    window_start = (
        datetime.now(timezone.utc) - timedelta(hours=hours_back)
    ).isoformat()

    service = get_email_service()
    emails = fetch_recent_emails(
        service, hours_back=hours_back, max_results=config.MAX_EMAILS_PER_RUN
    )

    run_id = db.record_run(window_start=window_start, emails_processed=len(emails))

    # Categorize every email and collect results into three buckets
    buckets: dict[str, list[dict]] = {"IMPORTANT": [], "ROUTINE": [], "JUNK": []}

    for email in emails:
        result = categorize_email(email)
        db.save_categorization(
            run_id=run_id,
            gmail_id=email.get("id", ""),
            category=result.category,
            reason=result.reason,
            summary=result.summary,
        )
        buckets[result.category].append(
            {"subject": email.get("subject", "(no subject)"), "summary": result.summary}
        )

    digest_text = _format_digest(buckets, len(emails))
    db.save_digest(run_id=run_id, digest_text=digest_text)
    return digest_text


def _format_digest(buckets: dict[str, list[dict]], total: int) -> str:
    """Turn the categorized buckets into a readable text digest."""
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
