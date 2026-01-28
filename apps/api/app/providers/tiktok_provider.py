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
    
    # Extract handle and video ID from resolved URL
    handle = _extract_handle_from_url(resolved_url)
    video_id = _extract_video_id_from_url(resolved_url)
    
    headers = {
        "x-api-key": settings.scrapecreators_api_key,
    }

    import sys
    print(f"Making API request to scrapecreators...", file=sys.stderr, flush=True)
    print(f"URL: {url}", file=sys.stderr, flush=True)
    print(f"Resolved URL: {resolved_url}", file=sys.stderr, flush=True)
    print(f"Handle: {handle}", file=sys.stderr, flush=True)
    print(f"Video ID: {video_id}", file=sys.stderr, flush=True)
    print(f"Headers: x-api-key present: {bool(headers.get('x-api-key'))}", file=sys.stderr, flush=True)

    video_data = None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # If we have a video_id (meaning we have a full video URL), try the v2 video-specific endpoint first
            # The v2 endpoint accepts the full URL and returns the specific video
            if video_id and resolved_url:
                video_endpoint = "https://api.scrapecreators.com/v2/tiktok/video"
                video_params = {"url": resolved_url}
                print(f"Attempting video-specific endpoint: {video_endpoint} with url={resolved_url}", file=sys.stderr, flush=True)
                
                try:
                    resp = await client.get(video_endpoint, params=video_params, headers=headers)
                    print(f"Video endpoint Response Status: {resp.status_code}", file=sys.stderr, flush=True)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        print(f"Video endpoint response keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}", file=sys.stderr, flush=True)
                        
                        # v2 endpoint returns data in aweme_detail field
                        if isinstance(data, dict) and "aweme_detail" in data:
                            video_data = data["aweme_detail"]
                            # Validate that we got actual video data
                            if video_data and (isinstance(video_data, dict) and ("aweme_id" in video_data or "desc" in video_data)):
                                print(f"Successfully fetched video data from v2 video endpoint (aweme_detail)", file=sys.stderr, flush=True)
                            else:
                                print(f"WARNING: v2 endpoint returned aweme_detail but it's empty/invalid, will fall back", file=sys.stderr, flush=True)
                                video_data = None
                        elif isinstance(data, dict) and ("aweme_id" in data or "desc" in data):
                            # If structure is different but has video data directly
                            video_data = data
                            print(f"Successfully fetched video data from v2 video endpoint (direct)", file=sys.stderr, flush=True)
                        else:
                            # Response structure doesn't match expected format
                            print(f"WARNING: v2 endpoint returned 200 but unexpected structure: {type(data)}, will fall back", file=sys.stderr, flush=True)
                            video_data = None
                    else:
                        error_text = resp.text[:200] if hasattr(resp, 'text') else str(resp.status_code)
                        print(f"Video endpoint returned {resp.status_code}: {error_text}, will fall back to profile endpoint", file=sys.stderr, flush=True)
                except Exception as video_exc:  # noqa: BLE001
                    print(f"Video endpoint failed: {str(video_exc)}, falling back to profile endpoint", file=sys.stderr, flush=True)
                    logger.warning("video_endpoint_failed", extra={"error": str(video_exc), "video_id": video_id, "url": resolved_url})

            # If video-specific endpoint didn't work or we don't have video_id, use profile endpoint
            if not video_data:
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

                # scrapecreators API endpoint for profile videos (v3 uses hyphen, not slash)
                endpoint = "https://api.scrapecreators.com/v3/tiktok/profile-videos"
                params = {
                    "handle": handle,
                    "sort_by": "latest",
                }
                # Increase amount to get more videos to search through
                if video_id:
                    params["amount"] = 50  # Get more videos to increase chance of finding the specific one
                
                print(f"Using profile endpoint: {endpoint} with handle={handle}, amount={params.get('amount', 'default')}", file=sys.stderr, flush=True)
                
                resp = await client.get(endpoint, params=params, headers=headers)
                print(f"Profile endpoint Response Status: {resp.status_code}", file=sys.stderr, flush=True)
                resp.raise_for_status()
                data = resp.json()
                print(f"API Response received, aweme_list length: {len(data.get('aweme_list', []))}", file=sys.stderr, flush=True)

                # Find the matching video in aweme_list by aweme_id
                if "aweme_list" in data and isinstance(data["aweme_list"], list):
                    if video_id:
                        print(f"Searching {len(data['aweme_list'])} videos for video_id: {video_id}", file=sys.stderr, flush=True)
                        # Try to find video by matching aweme_id (the video ID from URL)
                        for idx, video in enumerate(data["aweme_list"]):
                            # Match by aweme_id field (the actual field name in the API response)
                            video_aweme_id = str(video.get("aweme_id", ""))
                            if video_aweme_id == video_id:
                                video_data = video
                                print(f"✅ Found matching video in profile list by aweme_id at index {idx}: {video_id}", file=sys.stderr, flush=True)
                                break
                            # Also check if URL contains the video ID
                            video_url = video.get("url", "") or video.get("share_url", "") or video.get("video_url", "")
                            if video_id in str(video_url):
                                video_data = video
                                print(f"✅ Found matching video in profile list by URL match at index {idx}: {video_id}", file=sys.stderr, flush=True)
                                break
                            # Debug: log first few video IDs for troubleshooting
                            if idx < 5:
                                print(f"  Video {idx}: aweme_id={video_aweme_id}, url={str(video_url)[:80] if video_url else 'N/A'}", file=sys.stderr, flush=True)
                    # If not found by ID, DO NOT use first video - this causes the wrong video bug!
                    if not video_data and data["aweme_list"]:
                        print(f"❌ ERROR: Video ID {video_id} not found in profile list (searched {len(data['aweme_list'])} videos)", file=sys.stderr, flush=True)
                        first_video_id = data["aweme_list"][0].get("aweme_id", "N/A")
                        print(f"   First video in list has aweme_id: {first_video_id} (this would be wrong!)", file=sys.stderr, flush=True)
                        # Don't use the wrong video - let it fall through to return mock/error
                        # This prevents the bug where we use the latest video instead of the specific one

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

        # Handle both video-specific endpoint response and profile endpoint response
        # Video endpoint returns the video object directly, profile endpoint returns aweme_list
        if isinstance(video_data, dict) and "aweme_id" in video_data:
            # This is already a video object (from profile endpoint or video endpoint)
            pass
        elif isinstance(video_data, dict) and "data" in video_data:
            # Video endpoint might wrap the data
            video_data = video_data.get("data", video_data)
        
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

