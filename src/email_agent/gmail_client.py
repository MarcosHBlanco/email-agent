"""Gmail client. Handles OAuth authentication and email fetching."""

import os

from datetime import datetime, timedelta, timezone
from os import access
from sqlite3 import connect
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from googleapiclient.discovery import build

from email_agent import db

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",  # read + trash/untrash + label changes
    "https://www.googleapis.com/auth/gmail.send",  # send replies
]

# Google's OAuth token endpoints — needed to reconstruct Credentials and refresh.
TOKEN_URI = "https://oauth2.googleapis.com/token"


class GmailNotConnectedError(Exception):
    """Raised when a user tries to use Gmail but hans't connected an account."""


class GmailReauthError(Exception):
    """Raised when a user's stored token is expired or revoked and they must
    reconnect their Gmail (e.g. Testing-mode 7-day expiry, or a scope change)."""


def get_email_service(user_id: int) -> Any:
    """Build a Gmail service for a specific user from their stored tokens.

    Loads the user's encrypted connection, reconstructs credentials, refreshes
    the access token if expired (re-saving-it), and returns a Gmail service.

    Raises GmailNotConnectedError if the user hans't connected their Gmail.
    """

    connection = db.get_gmail_connection(user_id)
    if connection is None:
        raise GmailNotConnectedError(
            f"User {user_id} has not connected a Gmail account."
        )

    # Reconstruct the Credentials object from out stored tokens
    creds = Credentials(
        token=connection["access_token"],
        refresh_token=connection["refresh_token"],
        token_uri=TOKEN_URI,
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=SCOPES,
    )

    # We cannot trust creds.valid here: when credentials are reconstructed
    # without an expiry (which is always, given the constructor above),
    # creds.expiry is None, the library treats that as "not expired", and
    # creds.valid returns True even for a dead token. So we proactively
    # refresh at this chokepoint — forcing the token to prove itself HERE,
    # inside our try/except, rather than letting a later .execute() trigger
    # a lazy refresh somewhere we're not guarding.
    if creds.refresh_token:
        try:
            creds.refresh(Request())
        except RefreshError as e:
            # Refresh token is dead: revoked, expired under Testing mode's
            # 7-day rule, or invalidated by a scope change. Translate Google's
            # low-level error into our domain language.
            raise GmailReauthError(
                f"User {user_id}'s Gmail token is no longer valid; reconnect required."
            ) from e
        # creds.token is now a fresh access token — save it back (encrypted).
        db.save_gmail_connection(
            user_id=user_id,
            google_email=connection["google_email"],
            access_token=creds.token,
            refresh_token=creds.refresh_token or connection["refresh_token"],
            token_expiry=creds.expiry.isoformat() if creds.expiry else "",
        )
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
