"""Claude API wrapper. Provides a simple interface for the rest of the agent to call Claude."""

from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic()

DEFAULT_MODEL = "claude-sonnet-4-5"
DEFAULT_MAX_TOKENS = 1024


def ask_claude(prompt: str, max_tokens: int = DEFAULT_MAX_TOKENS, model: str = DEFAULT_MODEL) -> str:
    """Send a single-turn prompt to Claude and return the text response.

    Args:
        prompt: The user message to send.
        max_tokens: Maximum tokens in the response. Defaults to 1024.
        model: Which Claude model to use. Defaults to claude-sonnet-4-5.

    Returns:
        The text content of Claude's response.
    """
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )

    for block in response.content:
        if block.type == "text":
            return block.text

    return ""
