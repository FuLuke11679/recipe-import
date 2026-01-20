import logging
from typing import Dict, Optional

import httpx

logger = logging.getLogger(__name__)


async def fetch_oembed(url: str, access_token: Optional[str] = None) -> Dict:
    """Best-effort TikTok oEmbed fetch. Falls back to mock if not available."""
    endpoint = "https://www.tiktok.com/oembed"
    params = {"url": url}
    headers = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(endpoint, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("oembed_fetch_failed", extra={"error": str(exc)})
        return {
            "title": "Mock TikTok video",
            "author_name": "chef_bot",
            "provider_name": "tiktok",
            "thumbnail_url": None,
            "html": "",
            "fallback": True,
        }

