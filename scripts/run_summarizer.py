"""Entry point: run a full email digest and print it.

Usage: uv run python scripts/run_summarizer.py
"""

from email_agent.summarizer import run_digest


def main() -> None:
    print("Running email digest... (this may take a minute)\n")
    digest = run_digest()
    print(digest)


if __name__ == "__main__":
    main()
