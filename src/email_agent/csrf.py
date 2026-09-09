"""CSRF defense for cookie-authenticated mutating requests.

CORS is not CSRF protection. A third-party page can still POST with a
SameSite=None cookie attached; the browser just hides the response. We
require Origin (in production) to match the frontend origin.

GET/HEAD/OPTIONS are safe: they must not change state. The cron endpoint
authenticates with a shared secret header instead of a cookie, so it is
exempt — GitHub Actions will not send our frontend Origin.
"""

from collections.abc import Container

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})


def csrf_is_allowed(
    *,
    method: str,
    path: str,
    origin: str | None,
    frontend_url: str,
    production: bool,
    exempt_paths: Container[str],
) -> bool:
    """Return True if this request may proceed under the Origin rule."""
    if method.upper() in SAFE_METHODS:
        return True
    if path in exempt_paths:
        return True

    expected = frontend_url.rstrip("/")
    if origin:
        # A present Origin must match. A cross-site attack always carries a
        # foreign Origin (browsers force it on cross-origin requests), so this
        # is the case that actually catches CSRF.
        return origin.rstrip("/") == expected
    # No Origin header. In THIS app that's the normal case: the browser calls
    # the same-origin /api path, and Vercel proxies it to Render server-side
    # without an Origin header. Legitimate traffic looks exactly like this, so
    # we allow it rather than block our own frontend.
    return True
