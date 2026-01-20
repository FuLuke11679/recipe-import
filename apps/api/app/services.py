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
        return existing

    job = ImportJob(user_id=user_id, url=url, status=ImportStatus.CREATED)
    session.add(job)
    session.flush()

    job.status = ImportStatus.FETCHING_METADATA
    try:
        metadata = await tiktok_provider.fetch_oembed(url)
        job.metadata = metadata
        job.status = ImportStatus.METADATA_READY
    except Exception as exc:  # noqa: BLE001
        logger.error("metadata_fetch_failed", exc_info=exc)
        job.status = ImportStatus.FAILED
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
    if not job or not job.raw_recipe_text:
        raise ValueError("Import not ready")
    job.status = ImportStatus.EXTRACTING
    parsed_dict = llm_provider.extract_recipe(job.raw_recipe_text)
    recipe = Recipe.model_validate(parsed_dict)
    job.parsed_recipe = recipe.model_dump()
    job.status = ImportStatus.EXTRACTED
    return job


def adapt_recipe(session: Session, job_id: UUID, constraints: Constraints) -> ImportJob:
    job = session.get(ImportJob, job_id)
    if not job or not job.parsed_recipe:
        raise ValueError("Import not extracted")
    recipe = Recipe.model_validate(job.parsed_recipe)
    job.status = ImportStatus.ADAPTING
    adapted_dict, summary = llm_provider.adapt_recipe(recipe, constraints)
    adapted = Recipe.model_validate(adapted_dict)
    job.adapted_recipe = adapted.model_dump()
    job.change_summary = summary
    job.status = ImportStatus.ADAPTED
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

