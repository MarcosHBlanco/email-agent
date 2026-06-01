"""Gmail client. Handles OAuth authentication and email fetching."""

import os.path
from datetime import datetime, timedelta, timezone
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


def get_email_service() -> Any:
    """Authenticate with Gmail and return a service object.

    Uses cached token.json if available; otherwise launches the OAuth
    browser flow and saves the token for next time.

    Returns:
        A Gmail API service object ready for use.
    """
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)

        with open("token.json", "w") as token:
            token.write(creds.to_json())

    service = build("gmail", "v1", credentials=creds)
    return service


def fetch_recent_emails(
    service: Any, hours_back: int = 24, max_results: int = 100
) -> list[dict]:
    """Fetch emails received within the last N hours.

    Args:
        service: Authenticated Gmail service from get_email_service().
        hours_back: How many hours back to look. Defaults to 24.
        max_results: Maximum number of emails to return. Defaults to 100.

    Returns:
        A list of email dicts, each with id, snippet, subject, sender, and received timestamp.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    query = f"after:{int(since.timestamp())}"

    list_response = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=max_results)
        .execute()
    )
    message_refs = list_response.get("messages", [])

    emails = []
    for ref in message_refs:
        full = service.users().messages().get(userId="me", id=ref["id"]).execute()
        emails.append(_simplify_email(full))

    return emails


def _simplify_email(raw_email: dict) -> dict:
    """Convert Gmail's verbose message format into a simpler dict."""
    headers = {
        h["name"].lower(): h["value"]
        for h in raw_email.get("payload", {}).get("headers", [])
    }
    return {
        "id": raw_email["id"],
        "thread_id": raw_email.get("threadId"),
        "snippet": raw_email.get("snippet", ""),
        "subject": headers.get("subject", "(no subject)"),
        "sender": headers.get("from", "(unknown sender)"),
        "date": headers.get("date", ""),
    }
