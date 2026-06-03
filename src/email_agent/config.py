"""Configuration constants for the email agent."""

# How many hours back the first run looks (and the default per run)
DEFAULT_HOURS_BACK = 24

# Safety cap: never process more than this many emails in a single run
MAX_EMAILS_PER_RUN = 100

# Claude model used for categorization
CATEGORIZATION_MODEL = "claude-sonnet-4-5"

# Max tokens for a single categorization response (JSON is small)
CATEGORIZATION_MAX_TOKENS = 512

# Path to the SQLite database file (used in a later step)
DB_PATH = "email_agent.db"
