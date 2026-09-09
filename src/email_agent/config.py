"""Configuration constants for the email agent."""

# How many hours back the first run looks (and the default per run)
DEFAULT_HOURS_BACK = 24

# Safety cap: never process more than this many emails in a single run
MAX_EMAILS_PER_RUN = 100

# Claude model used for categorization
CATEGORIZATION_MODEL = "claude-sonnet-4-5"

# Max tokens for a single categorization response (JSON is small)
CATEGORIZATION_MAX_TOKENS = 512

# Parallel Gmail metadata fetches / Claude calls per digest (bounded).
GMAIL_FETCH_WORKERS = 8
CATEGORIZE_WORKERS = 4
CRON_USER_WORKERS = 4

# Refresh the Gmail access token this many seconds before expiry.
TOKEN_REFRESH_SKEW_SECONDS = 60

# OAuth CSRF ticket + PKCE verifier lifetime.
OAUTH_STATE_TTL_MINUTES = 10

# Digest lock: steal if a previous worker died mid-run.
DIGEST_LOCK_STALE_MINUTES = 15

# bcrypt silently truncates after 72 bytes — reject instead of hashing a prefix.
BCRYPT_MAX_PASSWORD_BYTES = 72
MIN_PASSWORD_LENGTH = 8
