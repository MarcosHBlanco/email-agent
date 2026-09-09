"""Claude API wrapper. Provides a simple interface for the rest of the agent to call Claude."""

from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic()

DEFAULT_MODEL = "claude-sonnet-4-5"
DEFAULT_MAX_TOKENS = 1024


def ask_claude(
    user: str,
    *,
    system: str | None = None,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    model: str = DEFAULT_MODEL,
) -> str:
    """Send a single-turn prompt to Claude and return the text response.

    `system` is the trusted instruction channel (preferences, rules).
    `user` is the untrusted payload (the email). They must stay separate —
    concatenating them into one user message collapses the trust boundary.
    """
    kwargs: dict = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": user}],
    }
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)

    for block in response.content:
        if block.type == "text":
            return block.text

    return ""
