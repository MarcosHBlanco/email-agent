"""Entry point: run a full email digest and print it as text.

Usage: uv run python scripts/run_summarizer.py
"""

from email_agent.summarizer import run_digest, format_digest_text


def main() -> None:
    print("Running email digest... (this may take a minute)\n")
    digest_data = run_digest()
    print(format_digest_text(digest_data))


if __name__ == "__main__":
    main()
