from email_agent.rate_limit import RateLimiter


def test_allows_under_limit():
    limiter = RateLimiter()
    assert limiter.allow("k", limit=2, window_seconds=60)
    assert limiter.allow("k", limit=2, window_seconds=60)
    assert limiter.allow("k", limit=2, window_seconds=60) is False


def test_keys_are_independent():
    limiter = RateLimiter()
    assert limiter.allow("a", limit=1, window_seconds=60)
    assert limiter.allow("b", limit=1, window_seconds=60)
