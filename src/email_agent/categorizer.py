"""Categorize a single email into IMPORTANT / ROUTINE / JUNK using Claude."""

import json
from dataclasses import dataclass

from email_agent import config
from email_agent.llm import ask_claude
from email_agent.prompts import (
    CATEGORIZATION_SYSTEM_PROMPT,
    build_categorization_user_message,
)

VALID_CATEGORIES = {"IMPORTANT", "ROUTINE", "JUNK"}


@dataclass
class CategorizationResult:
    """The structured result of categorizing one email."""

    category: str
    reason: str
    summary: str


def categorize_email(email: dict) -> CategorizationResult:
    """Send one email to Claude and return its category, reason, and summary.

    Args:
        email: A dict with 'subject', 'sender', and 'snippet' keys
               (as produced by gmail_client.fetch_recent_emails).

    Returns:
        A CategorizationResult. If anything goes wrong, falls back to
        IMPORTANT (the safe default - better to surface than to hide).
    """
    user_message = build_categorization_user_message(
        subject=email.get("subject", "(no subject)"),
        sender=email.get("sender", "(unknown sender)"),
        snippet=email.get("snippet", ""),
    )

    full_prompt = CATEGORIZATION_SYSTEM_PROMPT + "\n\n" + user_message

    raw_response = ask_claude(
        full_prompt,
        max_tokens=config.CATEGORIZATION_MAX_TOKENS,
        model=config.CATEGORIZATION_MODEL,
    )

    return _parse_response(raw_response)


def _parse_response(raw_response: str) -> CategorizationResult:
    """Parse Claude's JSON response into a CategorizationResult.

        Strips markdown code fences if present (Claude often wraps JSON in
    ```json ... ``` despite instructions not to), then parses.
        Falls back to a safe IMPORTANT result if parsing fails.
    """
    cleaned = raw_response.strip()

    # Strip markdown code fences if Claude wrapped the JSON in them
    if cleaned.startswith("```"):
        # Remove the opening fence line (``` or ```json)
        lines = cleaned.split("\n")
        lines = lines[1:]  # drop the first line (```json)
        # Remove the closing fence if present
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        data = json.loads(cleaned)
        category = data["category"].strip().upper()

        if category not in VALID_CATEGORIES:
            category = "IMPORTANT"

        return CategorizationResult(
            category=category,
            reason=data.get("reason", ""),
            summary=data.get("summary", ""),
        )
    except (json.JSONDecodeError, KeyError, AttributeError):
        return CategorizationResult(
            category="IMPORTANT",
            reason="Could not parse categorization response; defaulting to IMPORTANT.",
            summary=raw_response[:200],
        )
