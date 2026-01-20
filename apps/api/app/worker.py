import logging

from rq import Worker

from .queue import redis_conn

logging.basicConfig(level=logging.INFO)


def run():
    worker = Worker(queues=["imports"], connection=redis_conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    run()

