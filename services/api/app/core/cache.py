import logging

import redis

from .config import settings

logger = logging.getLogger(__name__)

_redis: redis.Redis | None = None
_redis_unavailable = False


class _NoOpRedis:
    """Fallback when Redis is unreachable — all reads miss, writes are silent no-ops."""

    def get(self, key: str):
        return None

    def setex(self, key: str, ttl: int, value: str):
        pass

    def set(self, key: str, value: str, ex: int | None = None):
        pass


def get_redis() -> redis.Redis | _NoOpRedis:
    """Return the Redis client singleton, or a no-op fallback if Redis is unavailable."""
    global _redis, _redis_unavailable

    if _redis_unavailable:
        return _NoOpRedis()

    if _redis is None:
        try:
            if settings.redis_url:
                client = redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
            else:
                client = redis.Redis(
                    host=settings.redis_host,
                    port=settings.redis_port,
                    db=settings.redis_db,
                    decode_responses=True,
                    socket_connect_timeout=2,
                )
            client.ping()
            _redis = client
        except Exception as exc:
            logger.warning("Redis unavailable, running without cache: %s", exc)
            _redis_unavailable = True
            return _NoOpRedis()

    return _redis
