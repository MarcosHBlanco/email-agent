"""Server-side HTML sanitization for outbound replies.

The composer sends innerHTML. Even with a CSRF Origin check we should not
forward arbitrary markup (scripts, javascript: links) to Gmail recipients.
"""

import bleach

# Permissive enough for a small rich-text composer; no <script>, <style>,
# or event-handler attributes (bleach strips those by default).
_REPLY_TAGS = [
    "p",
    "div",
    "span",
    "br",
    "a",
    "b",
    "i",
    "u",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
]
_REPLY_ATTRS = {
    "a": ["href", "title"],
}


def sanitize_reply_html(html: str) -> str:
    """Return HTML safe to send as an email body."""
    return bleach.clean(
        html,
        tags=_REPLY_TAGS,
        attributes=_REPLY_ATTRS,
        protocols=["http", "https", "mailto"],
        strip=True,
    )
