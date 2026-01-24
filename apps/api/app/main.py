import logging
from typing import Annotated, List
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import get_settings
from .db import Base, engine, get_session
from .logging import setup_logging
from .models import ImportJob
from .schemas import (
    AdaptRequest,
    ExtractRequest,
    GroceryListResponse,
    ImportCreateRequest,
    ImportResponse,
    RecipeTextRequest,
)
from .services import adapt_recipe, attach_recipe_text, build_grocery_list, create_import, extract_recipe
from .telemetry import capture_event, capture_exception

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe Import API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Session:
    with get_session() as session:
        yield session


@app.get("/")
def root():
    return {
        "name": "Recipe Import API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "POST /imports": "Create a new import job",
            "GET /imports/{id}": "Get import job details",
            "POST /imports/{id}/recipe_text": "Submit recipe text",
            "POST /imports/{id}/extract": "Extract structured recipe",
            "POST /imports/{id}/adapt": "Adapt recipe with constraints",
            "GET /imports/{id}/grocery_list": "Get grocery list",
            "GET /recipes?user_id={id}": "List all extracted recipes for a user",
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/recipes", response_model=List[ImportResponse])
def list_recipes(
    user_id: Annotated[str, Query()],
    session: Annotated[Session, Depends(get_db)],
):
    """List all extracted recipes for a user."""
    from sqlalchemy import select
    
    stmt = (
        select(ImportJob)
        .where(ImportJob.user_id == user_id)
        .where(ImportJob.parsed_recipe.isnot(None))
        .order_by(ImportJob.created_at.desc())
    )
    jobs = session.execute(stmt).scalars().all()
    return list(jobs)


@app.post("/imports", response_model=ImportResponse)
async def create_import_endpoint(payload: ImportCreateRequest, session: Annotated[Session, Depends(get_db)]):
    try:
        job = await create_import(session, payload.user_id, str(payload.url))
        session.commit()  # Explicitly commit before refresh
        session.refresh(job)
        capture_event("import_created", user_id=payload.user_id, properties={"id": str(job.id)})
        return job
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        capture_exception(exc)
        raise


@app.get("/imports/{import_id}", response_model=ImportResponse)
def get_import(import_id: UUID, session: Annotated[Session, Depends(get_db)]):
    job = session.get(ImportJob, import_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import not found")
    return job


@app.post("/imports/{import_id}/recipe_text", response_model=ImportResponse)
def post_recipe_text(
    import_id: UUID,
    payload: RecipeTextRequest,
    session: Annotated[Session, Depends(get_db)],
):
    try:
        job = attach_recipe_text(session, import_id, payload.text)
        session.commit()
        session.refresh(job)
        capture_event("recipe_text_submitted", properties={"import_id": str(import_id)})
        return job
    except ValueError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/imports/{import_id}/extract", response_model=ImportResponse)
def extract_endpoint(
    import_id: UUID,
    _: ExtractRequest,
    session: Annotated[Session, Depends(get_db)],
):
    try:
        job = extract_recipe(session, import_id)
        session.commit()
        session.refresh(job)
        logger.info("recipe_extracted_success", extra={"import_id": str(import_id), "has_recipe": bool(job.parsed_recipe)})
        capture_event("recipe_extracted", properties={"import_id": str(import_id)})
        return job
    except ValueError as exc:
        session.rollback()
        logger.error("extract_failed_value_error", extra={"import_id": str(import_id), "error": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        logger.error("extract_failed_unexpected", extra={"import_id": str(import_id), "error": str(exc)}, exc_info=exc)
        capture_exception(exc)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(exc)}")


@app.post("/imports/{import_id}/adapt", response_model=ImportResponse)
def adapt_endpoint(
    import_id: UUID,
    payload: AdaptRequest,
    session: Annotated[Session, Depends(get_db)],
):
    try:
        job = adapt_recipe(session, import_id, payload.constraints)
        session.commit()
        session.refresh(job)
        capture_event("recipe_adapted", properties={"import_id": str(import_id)})
        return job
    except ValueError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/imports/{import_id}/grocery_list", response_model=GroceryListResponse)
def grocery_list(import_id: Annotated[UUID, Path()], session: Annotated[Session, Depends(get_db)]):
    job = session.get(ImportJob, import_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import not found")
    try:
        items = build_grocery_list(job)
        return GroceryListResponse(items=items, recipe_title=job.parsed_recipe.get("title") if job.parsed_recipe else "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
