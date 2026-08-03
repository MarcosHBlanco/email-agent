"""Tests for reply construction: threading headers and reply-all recipients."""

from email_agent.gmail_client import build_reply_message

import base64
from email import message_from_bytes
from email.message import Message

import pytest


def decode(raw: str) -> Message:
    """Decode what build_reply_message produced back into a Message.

    The function returns base64url text destined for Gmail's API, so to make
    assertions we reverse that: decode, then parse. Tests then read headers
    the same way a receiving mail client would.
    """
    padding = "=" * (-len(raw) % 4)
    return message_from_bytes(base64.urlsafe_b64decode(raw + padding))


@pytest.fixture
def original():
    """A typical received email: from Alice, to me and Bob, cc Carol."""
    return {
        "sender": "Alice Smith <alice@example.com>",
        "to": "Marcos <marcos@test.com>, Bob <bob@example.com>",
        "cc": "Carol <carol@example.com>",
        "subject": "Project update",
        "message_id": "<abc123@mail.gmail.com>",
        "references": "<older1@mail.com> <older2@mail.com>",
        "reply_to": "",
        "thread_id": "thread789",
    }


MY_EMAIL = "marcos@test.com"


def build(original, reply_all=False, my_email=MY_EMAIL):
    return decode(build_reply_message(original, my_email, "hi", "<p>hi</p>", reply_all))


# --- Recipients -----------------------------------------------------------


def test_reply_goes_to_sender(original):
    msg = build(original)
    assert "alice@example.com" in msg["To"]


def test_plain_reply_has_no_cc(original):
    msg = build(original, reply_all=False)
    assert msg["Cc"] is None


def test_reply_all_ccs_other_recipients(original):
    msg = build(original, reply_all=True)
    assert "bob@example.com" in msg["Cc"]
    assert "carol@example.com" in msg["Cc"]


def test_reply_all_never_ccs_yourself(original):
    msg = build(original, reply_all=True)
    assert "marcos@test.com" not in (msg["Cc"] or "")


def test_self_exclusion_is_case_insensitive(original):
    original["to"] = "MARCOS@TEST.COM, Bob <bob@example.com>"
    msg = build(original, reply_all=True)
    assert "marcos@test.com" not in (msg["Cc"] or "").lower()


def test_reply_all_does_not_duplicate_primary_recipient(original):
    """Alice is the sender AND on the To line — she must not also be Cc'd."""
    original["to"] = "Alice Smith <alice@example.com>, Bob <bob@example.com>"
    msg = build(original, reply_all=True)
    assert "alice@example.com" not in (msg["Cc"] or "")


def test_reply_all_dedupes_address_on_both_to_and_cc(original):
    original["to"] = "Bob <bob@example.com>"
    original["cc"] = "Bob <bob@example.com>"
    msg = build(original, reply_all=True)
    assert msg["Cc"].count("bob@example.com") == 1


def test_reply_to_header_wins_over_sender(original):
    """Mailing lists set Reply-To; responses must go there, not to the sender."""
    original["reply_to"] = "list@discuss.example.com"
    msg = build(original)
    assert "list@discuss.example.com" in msg["To"]
    assert "alice@example.com" not in msg["To"]


def test_display_names_are_preserved(original):
    msg = build(original, reply_all=True)
    assert "Bob" in msg["Cc"]


# --- Subject --------------------------------------------------------------


def test_subject_gets_re_prefix(original):
    msg = build(original)
    assert msg["Subject"] == "Re: Project update"


def test_subject_not_double_prefixed(original):
    original["subject"] = "Re: Project update"
    msg = build(original)
    assert msg["Subject"] == "Re: Project update"


def test_subject_prefix_check_is_case_insensitive(original):
    original["subject"] = "RE: Project update"
    msg = build(original)
    assert msg["Subject"] == "RE: Project update"


# --- Threading ------------------------------------------------------------


def test_in_reply_to_is_the_originals_message_id(original):
    msg = build(original)
    assert msg["In-Reply-To"] == "<abc123@mail.gmail.com>"


def test_references_appends_to_existing_chain(original):
    msg = build(original)
    assert msg["References"] == (
        "<older1@mail.com> <older2@mail.com> <abc123@mail.gmail.com>"
    )


def test_references_starts_chain_when_original_had_none(original):
    original["references"] = ""
    msg = build(original)
    assert msg["References"] == "<abc123@mail.gmail.com>"


def test_no_threading_headers_when_message_id_missing(original):
    """Some automated senders omit Message-ID. Better unthreaded than malformed."""
    original["message_id"] = ""
    msg = build(original)
    assert msg["In-Reply-To"] is None
    assert msg["References"] is None


# --- Body structure -------------------------------------------------------


def test_body_is_multipart_alternative(original):
    msg = build(original)
    assert msg.get_content_type() == "multipart/alternative"


def test_html_part_comes_last(original):
    """Clients prefer the LAST alternative, so HTML must follow plain."""
    msg = build(original)
    subtypes = [p.get_content_type() for p in msg.walk()]
    assert subtypes == ["multipart/alternative", "text/plain", "text/html"]
