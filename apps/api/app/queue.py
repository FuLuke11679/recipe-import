import redis
from rq import Queue

from .config import get_settings


settings = get_settings()
redis_conn = redis.Redis.from_url(settings.redis_url)
rq_queue = Queue("imports", connection=redis_conn)


def enqueue(func, *args, **kwargs):
    return rq_queue.enqueue(func, *args, **kwargs)

