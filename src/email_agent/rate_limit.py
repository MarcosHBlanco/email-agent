"""In-memory sliding-window rate limiter.

Per-process only: on Render a restart clears counters, and multiple
instances do not share state. That is enough to stop casual brute force
and digest double-clicks; a distributed limiter would need Redis.

Thread-safe because FastAPI sync routes run on a thread pool.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict


class RateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # key -> timestamps of accepted hits (seconds since epoch)
        self._hits: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str, *, limit: int, window_seconds: float) -> bool:
        """Return True if this hit is inside the window budget, else False."""
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            times = self._hits[key]
            # Drop timestamps that have left the window so memory stays bounded.
            times[:] = [t for t in times if t > cutoff]
            if len(times) >= limit:
                return False
            times.append(now)
            return True


# Process-wide limiter used by the API.
limiter = RateLimiter()
