import logging
from typing import Optional

logger = logging.getLogger(__name__)


def capture_event(event: str, user_id: Optional[str] = None, properties: Optional[dict] = None) -> None:
    # Stub for PostHog; replace with real client when keys available
    logger.info("event", extra={"event": event, "user_id": user_id, "properties": properties or {}})


def capture_exception(exc: Exception) -> None:
    # Stub for Sentry; replace with real SDK when DSN available
    logger.error("exception", exc_info=exc)

