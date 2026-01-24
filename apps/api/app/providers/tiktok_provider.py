import logging
import re
from typing import Dict, Optional

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


async def _resolve_shortened_url(url: str) -> str:
    """Resolve shortened TikTok URL (tiktok.com/t/...) to full URL by following redirects."""
    import sys
    # Check if it's a shortened URL
    if "/t/" in url or "/v/" in url:
        print(f"\nAttempting to resolve shortened URL: {url}", file=sys.stderr, flush=True)
        try:
            # Use browser-like headers to avoid blocking
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": "https://www.tiktok.com/",
            }
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                # Try GET directly (HEAD often doesn't work with TikTok)
                try:
                    print(f"Making GET request to resolve URL...", file=sys.stderr, flush=True)
                    resp = await client.get(url, headers=headers, follow_redirects=True)
                    final_url = str(resp.url)
                    print(f"Response status: {resp.status_code}", file=sys.stderr, flush=True)
                    print(f"Final URL after redirects: {final_url}", file=sys.stderr, flush=True)
                    
                    if final_url != url and ("/video/" in final_url or "@" in final_url):
                        logger.info("resolved_shortened_url", extra={"original": url, "resolved": final_url})
                        print(f"Successfully resolved shortened URL!", file=sys.stderr, flush=True)
                        return final_url
                    else:
                        print(f"URL not fully resolved or doesn't contain expected patterns", file=sys.stderr, flush=True)
                except Exception as get_exc:  # noqa: BLE001
                    print(f"GET request failed: {str(get_exc)}", file=sys.stderr, flush=True)
                    raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("failed_to_resolve_shortened_url", extra={"url": url, "error": str(exc)})
            print(f"Failed to resolve shortened URL: {str(exc)}", file=sys.stderr, flush=True)
    else:
        print(f"URL is not shortened format, skipping resolution: {url}", file=sys.stderr, flush=True)
    return url


def _extract_handle_from_url(url: str) -> Optional[str]:
    """Extract TikTok handle from URL (e.g., @username from https://www.tiktok.com/@username/video/123)."""
    match = re.search(r"@([^/]+)", url)
    if match:
        return match.group(1)
    return None


def _extract_video_id_from_url(url: str) -> Optional[str]:
    """Extract video ID from TikTok URL."""
    match = re.search(r"/video/(\d+)", url)
    if match:
        return match.group(1)
    return None


async def fetch_oembed(url: str) -> Dict:
    """Fetch TikTok metadata using scrapecreators API. Falls back to mock if API call fails."""
    settings = get_settings()
    
    import sys
    print(f"Checking scrapecreators API key...", file=sys.stderr, flush=True)
    print(f"API key present: {bool(settings.scrapecreators_api_key)}", file=sys.stderr, flush=True)
    print(f"API key length: {len(settings.scrapecreators_api_key) if settings.scrapecreators_api_key else 0}", file=sys.stderr, flush=True)
    
    if not settings.scrapecreators_api_key:
        logger.warning("scrapecreators_api_key_not_set", extra={"fallback": "mock"})
        print(f"WARNING: scrapecreators_api_key not set, using mock data", file=sys.stderr, flush=True)
        return {
            "title": "Mock TikTok video",
            "author_name": "chef_bot",
            "provider_name": "tiktok",
            "description": "",
            "caption": "",
            "thumbnail_url": None,
            "html": "",
            "fallback": True,
        }

    # Resolve shortened URLs first
    resolved_url = await _resolve_shortened_url(url)
    
    # Extract handle from resolved URL
    handle = _extract_handle_from_url(resolved_url)
    video_id = _extract_video_id_from_url(resolved_url)
    
    if not handle:
        logger.warning("could_not_extract_handle", extra={"url": url, "resolved_url": resolved_url, "fallback": "mock"})
        print(f"WARNING: Could not extract handle from URL: {url}", file=sys.stderr, flush=True)
        print(f"Resolved URL: {resolved_url}", file=sys.stderr, flush=True)
        return {
            "title": "Mock TikTok video",
            "author_name": "chef_bot",
            "provider_name": "tiktok",
            "description": "",
            "caption": "",
            "thumbnail_url": None,
            "html": "",
            "fallback": True,
        }

    # scrapecreators API endpoint for profile videos
    endpoint = "https://api.scrapecreators.com/v3/tiktok/profile/videos"
    headers = {
        "x-api-key": settings.scrapecreators_api_key,
    }
    params = {
        "handle": handle,
        "sort_by": "latest",
    }

    import sys
    print(f"Making API request to scrapecreators...", file=sys.stderr, flush=True)
    print(f"Endpoint: {endpoint}", file=sys.stderr, flush=True)
    print(f"Handle: {handle}", file=sys.stderr, flush=True)
    print(f"Headers: x-api-key present: {bool(headers.get('x-api-key'))}", file=sys.stderr, flush=True)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(endpoint, params=params, headers=headers)
            print(f"API Response Status: {resp.status_code}", file=sys.stderr, flush=True)
            resp.raise_for_status()
            data = resp.json()
            print(f"API Response received, aweme_list length: {len(data.get('aweme_list', []))}", file=sys.stderr, flush=True)

        # Find the matching video in aweme_list
        video_data = None
        if "aweme_list" in data and isinstance(data["aweme_list"], list):
            if video_id:
                # Try to find video by matching video ID
                for video in data["aweme_list"]:
                    if str(video.get("aweme_id")) == video_id or video.get("url", "").endswith(video_id):
                        video_data = video
                        break
            # If not found by ID, use first video (most recent)
            if not video_data and data["aweme_list"]:
                video_data = data["aweme_list"][0]

        if not video_data:
            logger.warning("video_not_found_in_response", extra={"url": url, "handle": handle, "fallback": "mock"})
            return {
                "title": "Mock TikTok video",
                "author_name": handle or "unknown",
                "provider_name": "tiktok",
                "description": "",
                "caption": "",
                "thumbnail_url": None,
                "html": "",
                "fallback": True,
            }

        # Extract caption from desc field
        caption = video_data.get("desc", "").strip()
        author_info = video_data.get("author", {})
        author_name = author_info.get("nickname") or author_info.get("unique_id") or handle or "unknown"
        
        # Extract thumbnail
        thumbnail_url = None
        video_obj = video_data.get("video", {})
        if video_obj:
            cover = video_obj.get("cover", {})
            if cover and cover.get("url_list"):
                thumbnail_url = cover["url_list"][0] if cover["url_list"] else None

        # Extract transcript from caption_infos (subtitle/transcript data)
        transcript = ""
        transcript_url = None
        cla_info = video_obj.get("cla_info", {}) if video_obj else {}
        caption_infos = cla_info.get("caption_infos", [])
        if caption_infos and len(caption_infos) > 0:
            # Get the first caption info (usually the main transcript)
            caption_info = caption_infos[0]
            transcript_url = caption_info.get("url") or (caption_info.get("url_list", [])[0] if caption_info.get("url_list") else None)
            
            # Try to fetch transcript content if URL is available
            if transcript_url:
                try:
                    async with httpx.AsyncClient(timeout=10.0) as transcript_client:
                        transcript_resp = await transcript_client.get(transcript_url)
                        transcript_resp.raise_for_status()
                        transcript_content = transcript_resp.text
                        # Parse WebVTT format - extract text lines (skip headers and timestamps)
                        lines = transcript_content.split("\n")
                        transcript_lines = []
                        for line in lines:
                            line = line.strip()
                            # Skip WebVTT headers, timestamps, and empty lines
                            if line and not line.startswith("WEBVTT") and not line.startswith("NOTE") and "-->" not in line and not line.isdigit():
                                transcript_lines.append(line)
                        transcript = " ".join(transcript_lines).strip()
                except Exception as transcript_exc:  # noqa: BLE001
                    logger.warning("transcript_fetch_failed", extra={"error": str(transcript_exc), "url": transcript_url})
                    transcript = ""  # Keep empty if fetch fails

        result = {
            "title": caption[:100] if caption else "TikTok Video",  # Use caption as title if available
            "author_name": author_name,
            "provider_name": "tiktok",
            "description": caption,
            "caption": caption,  # The main caption text
            "transcript": transcript,  # The full transcript/subtitle text
            "transcript_url": transcript_url,  # URL to transcript file if available
            "thumbnail_url": thumbnail_url,
            "html": "",
            "url": url,
        }

        # Log caption and transcript to terminal for testing (force to stderr for Docker logs)
        import sys
        print(f"\n{'='*60}", file=sys.stderr, flush=True)
        print(f"TikTok Data Extracted:", file=sys.stderr, flush=True)
        print(f"URL: {url}", file=sys.stderr, flush=True)
        print(f"Author: {author_name}", file=sys.stderr, flush=True)
        print(f"\n--- CAPTION ---", file=sys.stderr, flush=True)
        print(f"{caption}", file=sys.stderr, flush=True)
        print(f"Caption Length: {len(caption)} characters", file=sys.stderr, flush=True)
        if transcript:
            print(f"\n--- TRANSCRIPT ---", file=sys.stderr, flush=True)
            print(f"{transcript}", file=sys.stderr, flush=True)
            print(f"Transcript Length: {len(transcript)} characters", file=sys.stderr, flush=True)
        else:
            print(f"\n--- TRANSCRIPT ---", file=sys.stderr, flush=True)
            print("No transcript available", file=sys.stderr, flush=True)
        print(f"{'='*60}\n", file=sys.stderr, flush=True)

        logger.info(
            "tiktok_scrapecreators_fetched",
            extra={
                "url": url,
                "handle": handle,
                "video_id": video_id,
                "title": result["title"],
                "has_caption": bool(caption),
                "caption_length": len(caption) if caption else 0,
            },
        )

        return result

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "scrapecreators_api_failed",
            extra={"error": str(exc), "url": url, "fallback": "mock"},
        )
        import sys
        print(f"\n{'='*60}", file=sys.stderr, flush=True)
        print(f"TikTok Scraping Failed:", file=sys.stderr, flush=True)
        print(f"URL: {url}", file=sys.stderr, flush=True)
        print(f"Error: {str(exc)}", file=sys.stderr, flush=True)
        print(f"{'='*60}\n", file=sys.stderr, flush=True)
        return {
            "title": "Mock TikTok video",
            "author_name": "chef_bot",
            "provider_name": "tiktok",
            "description": "",
            "caption": "",
            "thumbnail_url": None,
            "html": "",
            "fallback": True,
        }

