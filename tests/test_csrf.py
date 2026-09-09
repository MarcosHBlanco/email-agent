"""CSRF Origin checks — no database required."""

from email_agent.csrf import csrf_is_allowed

FRONTEND = "https://sift.example"


def test_get_is_always_allowed():
    assert csrf_is_allowed(
        method="GET",
        path="/digest/latest",
        origin="https://evil.example",
        frontend_url=FRONTEND,
        production=True,
        exempt_paths=set(),
    )


def test_cron_is_exempt():
    assert csrf_is_allowed(
        method="POST",
        path="/cron/run-digests",
        origin=None,
        frontend_url=FRONTEND,
        production=True,
        exempt_paths={"/cron/run-digests"},
    )


def test_production_post_rejects_mismatched_origin():
    kwargs = dict(
        method="POST",
        path="/emails/abc/reply",
        frontend_url=FRONTEND,
        production=True,
        exempt_paths={"/cron/run-digests"},
    )
    assert csrf_is_allowed(origin=FRONTEND, **kwargs)
    assert not csrf_is_allowed(origin="https://evil.example", **kwargs)
    # Absent Origin is ALLOWED in production: our frontend calls the
    # same-origin /api path, which Vercel proxies to Render server-side with
    # no Origin header — so legitimate traffic looks Origin-less. A real
    # cross-site attack always carries a foreign Origin and is caught by the
    # mismatch assertion above.
    assert csrf_is_allowed(origin=None, **kwargs)


def test_dev_allows_missing_origin():
    assert csrf_is_allowed(
        method="POST",
        path="/auth/login",
        origin=None,
        frontend_url="http://localhost:3000",
        production=False,
        exempt_paths=set(),
    )
