import redis

from .config import settings

_redis: redis.Redis | None = None


def get_redis() -> redis.Redis:
    """Return the Redis client singleton."""
    global _redis
    if _redis is None:
        _redis = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            decode_responses=True,
        )
    return _redis
