"""Entry point for the summarizer. Smoke test for the migration."""

from email_agent.gmail_client import get_email_service, fetch_recent_emails
from email_agent.llm import ask_claude


def main() -> None:
    print("Authenticating with Gmail...")
    service = get_email_service()

    print("Fetching recent emails...")
    emails = fetch_recent_emails(service, hours_back=24)
    print(f"Fetched {len(emails)} emails from the last 24 hours.\n")

    if not emails:
        print("No emails to show.")
        return

    print("Most recent email:")
    first = emails[0]
    print(f"  From:    {first['sender']}")
    print(f"  Subject: {first['subject']}")
    print(f"  Snippet: {first['snippet'][:120]}...")
    print()

    print("Asking Claude for a one-line summary of that email...")
    prompt = (
        f"Summarize this email in one sentence:\n\n"
        f"From: {first['sender']}\n"
        f"Subject: {first['subject']}\n"
        f"Content: {first['snippet']}"
    )
    summary = ask_claude(prompt, max_tokens=200)
    print(f"\nClaude's summary: {summary}")


if __name__ == "__main__":
    main()
