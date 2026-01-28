import logging
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ImportJob
from .providers import llm_provider, tiktok_provider
from .schemas import Constraints, GroceryItem, ImportStatus, Recipe

logger = logging.getLogger(__name__)


def get_recent_import(session: Session, user_id: str, url: str) -> Optional[ImportJob]:
    since = datetime.utcnow() - timedelta(hours=24)
    stmt = (
        select(ImportJob)
        .where(ImportJob.user_id == user_id)
        .where(ImportJob.url == url)
        .where(ImportJob.created_at >= since)
        .limit(1)
    )
    res = session.execute(stmt).scalar_one_or_none()
    return res


async def create_import(session: Session, user_id: str, url: str) -> ImportJob:
    existing = get_recent_import(session, user_id, url)
    if existing:
        logger.info("returning_existing_import", extra={"job_id": str(existing.id), "url": url})
        return existing

    job = ImportJob(user_id=user_id, url=url, status=ImportStatus.CREATED)
    session.add(job)
    session.flush()

    job.status = ImportStatus.FETCHING_METADATA
    session.flush()
    session.commit()  # Explicitly commit status change so it's visible immediately
    
    # Force print to stdout/stderr for Docker logs
    import sys
    print(f"\n{'='*60}", file=sys.stderr, flush=True)
    print(f"Starting TikTok import:", file=sys.stderr, flush=True)
    print(f"Job ID: {job.id}", file=sys.stderr, flush=True)
    print(f"URL: {url}", file=sys.stderr, flush=True)
    print(f"User ID: {user_id}", file=sys.stderr, flush=True)
    print(f"Status set to: FETCHING_METADATA", file=sys.stderr, flush=True)
    print(f"{'='*60}\n", file=sys.stderr, flush=True)
    
    try:
        metadata = await tiktok_provider.fetch_oembed(url)
        job.import_metadata = metadata
        
        # Auto-populate recipe text with caption if available
        caption = metadata.get("caption") or metadata.get("description")
        transcript = metadata.get("transcript", "")
        
        if caption and caption.strip():
            job.raw_recipe_text = caption.strip()
            logger.info("auto_populated_recipe_text_from_caption", extra={"job_id": str(job.id), "caption_length": len(caption)})
            print(f"\n{'='*60}", file=sys.stderr, flush=True)
            print(f"Auto-populated recipe text with caption:", file=sys.stderr, flush=True)
            print(f"Job ID: {job.id}", file=sys.stderr, flush=True)
            print(f"Caption: {caption[:200]}..." if len(caption) > 200 else f"Caption: {caption}", file=sys.stderr, flush=True)
            if transcript:
                print(f"Transcript: {transcript[:200]}..." if len(transcript) > 200 else f"Transcript: {transcript}", file=sys.stderr, flush=True)
            print(f"{'='*60}\n", file=sys.stderr, flush=True)
            job.status = ImportStatus.AWAITING_RECIPE_TEXT
        else:
            print(f"\n{'='*60}", file=sys.stderr, flush=True)
            print(f"No caption found in metadata", file=sys.stderr, flush=True)
            print(f"Metadata keys: {list(metadata.keys()) if metadata else 'None'}", file=sys.stderr, flush=True)
            print(f"{'='*60}\n", file=sys.stderr, flush=True)
            job.status = ImportStatus.METADATA_READY
        session.flush()
        session.commit()  # Commit successful metadata fetch
    except Exception as exc:  # noqa: BLE001
        logger.error("metadata_fetch_failed", exc_info=exc)
        import traceback
        print(f"\n{'='*60}", file=sys.stderr, flush=True)
        print(f"ERROR: Metadata fetch failed:", file=sys.stderr, flush=True)
        print(f"Job ID: {job.id}", file=sys.stderr, flush=True)
        print(f"URL: {url}", file=sys.stderr, flush=True)
        print(f"Error: {str(exc)}", file=sys.stderr, flush=True)
        print(f"Error type: {type(exc).__name__}", file=sys.stderr, flush=True)
        print(f"Traceback:\n{traceback.format_exc()}", file=sys.stderr, flush=True)
        print(f"{'='*60}\n", file=sys.stderr, flush=True)
        job.status = ImportStatus.FAILED
        session.flush()
        session.commit()  # Commit failure status
    return job


def attach_recipe_text(session: Session, job_id: UUID, text: str) -> ImportJob:
    job = session.get(ImportJob, job_id)
    if not job:
        raise ValueError("Import not found")
    job.raw_recipe_text = text
    if job.status in {ImportStatus.METADATA_READY, ImportStatus.CREATED, ImportStatus.FETCHING_METADATA}:
        job.status = ImportStatus.AWAITING_RECIPE_TEXT
    return job


def extract_recipe(session: Session, job_id: UUID) -> ImportJob:
    job = session.get(ImportJob, job_id)
    if not job:
        raise ValueError("Import not found")
    
    # Collect recipe text from multiple sources: caption, transcript, and raw_recipe_text
    metadata = job.import_metadata or {}
    caption = metadata.get("caption") or metadata.get("description") or ""
    transcript = metadata.get("transcript") or ""
    raw_text = job.raw_recipe_text or ""
    
    # Combine all sources for better extraction
    combined_text_parts = []
    if caption:
        combined_text_parts.append(f"CAPTION:\n{caption}")
    if transcript:
        combined_text_parts.append(f"TRANSCRIPT:\n{transcript}")
    if raw_text and raw_text not in [caption, transcript]:
        combined_text_parts.append(f"RECIPE TEXT:\n{raw_text}")
    
    if not combined_text_parts:
        raise ValueError("No recipe text available (need caption, transcript, or raw_recipe_text)")
    
    combined_text = "\n\n".join(combined_text_parts)
    
    logger.info("extracting_recipe", extra={
        "job_id": str(job_id),
        "has_caption": bool(caption),
        "has_transcript": bool(transcript),
        "has_raw_text": bool(raw_text),
        "combined_length": len(combined_text)
    })
    
    job.status = ImportStatus.EXTRACTING
    session.flush()  # Make status change visible immediately
    
    try:
        # Extract recipe using combined text (caption + transcript + raw_text)
        parsed_dict = llm_provider.extract_recipe(combined_text)
        logger.info("recipe_extracted_from_llm", extra={
            "job_id": str(job_id),
            "has_title": "title" in parsed_dict,
            "ingredients_count": len(parsed_dict.get("ingredients", []))
        })
        
        recipe = Recipe.model_validate(parsed_dict)
        job.parsed_recipe = recipe.model_dump()
        job.status = ImportStatus.EXTRACTED
        session.flush()  # Make recipe data visible immediately
        
        logger.info("recipe_saved_to_db", extra={
            "job_id": str(job_id),
            "recipe_title": recipe.title,
            "ingredients_count": len(recipe.ingredients),
            "ingredients_with_amounts": sum(1 for ing in recipe.ingredients if ing.quantity is not None)
        })
        return job
    except Exception as exc:  # noqa: BLE001
        logger.error("extraction_validation_failed", extra={"job_id": str(job_id), "error": str(exc)}, exc_info=exc)
        job.status = ImportStatus.FAILED
        session.flush()
        raise


def adapt_recipe(session: Session, job_id: UUID, constraints: Constraints) -> ImportJob:
    job = session.get(ImportJob, job_id)
    if not job or not job.parsed_recipe:
        raise ValueError("Import not extracted")
    recipe = Recipe.model_validate(job.parsed_recipe)
    job.status = ImportStatus.ADAPTING
    session.flush()  # Make status change visible immediately
    adapted_dict, summary = llm_provider.adapt_recipe(recipe, constraints)
    adapted = Recipe.model_validate(adapted_dict)
    job.adapted_recipe = adapted.model_dump()
    job.change_summary = summary
    job.status = ImportStatus.ADAPTED
    session.flush()  # Make adapted recipe visible immediately
    return job


def build_grocery_list(job: ImportJob) -> List[GroceryItem]:
    recipe_data = job.adapted_recipe or job.parsed_recipe
    if not recipe_data:
        raise ValueError("No recipe available")
    recipe = Recipe.model_validate(recipe_data)
    items: List[GroceryItem] = []
    for ing in recipe.ingredients:
        items.append(
            GroceryItem(
                name=ing.name,
                quantity=ing.quantity,
                unit=ing.unit,
                checked=False,
            )
        )
    return items

