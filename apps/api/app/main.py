import logging
from typing import Annotated, List
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Path, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import get_settings
from .db import Base, engine, get_session
from .logging import setup_logging
from .models import ImportJob, User
from .schemas import (
    AdaptRequest,
    ExtractRequest,
    GroceryListResponse,
    ImportCreateRequest,
    ImportResponse,
    RecipeTextRequest,
    Token,
    UserLogin,
    UserRegister,
    UserResponse,
)
from .services import adapt_recipe, attach_recipe_text, build_grocery_list, create_import, extract_recipe
from .telemetry import capture_event, capture_exception
from .auth import (
    authenticate_user,
    create_access_token,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
)

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


# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    session: Annotated[Session, Depends(get_db)],
):
    """Register a new user."""
    # Check if username already exists
    if get_user_by_username(session, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    
    # Check if email already exists
    if get_user_by_email(session, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    logger.info("user_registered", extra={"user_id": str(user.id), "username": user.username})
    capture_event("user_registered", properties={"user_id": str(user.id)})
    
    return user


@app.post("/auth/login", response_model=Token)
def login(
    credentials: UserLogin,
    session: Annotated[Session, Depends(get_db)],
):
    """Login and get access token."""
    user = authenticate_user(session, credentials.username, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    logger.info("user_logged_in", extra={"user_id": str(user.id), "username": user.username})
    capture_event("user_logged_in", properties={"user_id": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user information."""
    return current_user


@app.get("/recipes", response_model=List[ImportResponse])
def list_recipes(
    session: Annotated[Session, Depends(get_db)],
    current_user: User = Depends(get_current_active_user),
):
    """List all extracted recipes for the current user."""
    from sqlalchemy import select
    
    stmt = (
        select(ImportJob)
        .where(ImportJob.user_id == str(current_user.id))
        .where(ImportJob.parsed_recipe.isnot(None))
        .order_by(ImportJob.created_at.desc())
    )
    jobs = session.execute(stmt).scalars().all()
    return list(jobs)


@app.post("/imports", response_model=ImportResponse)
async def create_import_endpoint(
    payload: ImportCreateRequest,
    session: Annotated[Session, Depends(get_db)],
    current_user: User = Depends(get_current_active_user),
):
    try:
        # Use authenticated user's ID instead of payload user_id
        job = await create_import(session, str(current_user.id), str(payload.url))
        session.commit()  # Explicitly commit before refresh
        session.refresh(job)
        capture_event("import_created", user_id=str(current_user.id), properties={"id": str(job.id)})
        return job
    except Exception as exc:  # noqa: BLE001
        session.rollback()
        capture_exception(exc)
        raise


@app.get("/imports/{import_id}", response_model=ImportResponse)
def get_import(
    import_id: UUID,
    session: Annotated[Session, Depends(get_db)],
    current_user: User = Depends(get_current_active_user),
):
    job = session.get(ImportJob, import_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import not found")
    # Verify the job belongs to the current user
    if job.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this import")
    return job


@app.post("/imports/{import_id}/recipe_text", response_model=ImportResponse)
def post_recipe_text(
    import_id: UUID,
    payload: RecipeTextRequest,
    session: Annotated[Session, Depends(get_db)],
    current_user: User = Depends(get_current_active_user),
):
    try:
        # Verify the job belongs to the current user
        job = session.get(ImportJob, import_id)
        if not job:
            raise HTTPException(status_code=404, detail="Import not found")
        if job.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this import")
        
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
    current_user: User = Depends(get_current_active_user),
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
    current_user: User = Depends(get_current_active_user),
):
    try:
        # Verify the job belongs to the current user
        job = session.get(ImportJob, import_id)
        if not job:
            raise HTTPException(status_code=404, detail="Import not found")
        if job.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this import")
        
        job = adapt_recipe(session, import_id, payload.constraints)
        session.commit()
        session.refresh(job)
        capture_event("recipe_adapted", properties={"import_id": str(import_id)})
        return job
    except ValueError as exc:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/imports/{import_id}/grocery_list", response_model=GroceryListResponse)
def grocery_list(
    import_id: Annotated[UUID, Path()],
    session: Annotated[Session, Depends(get_db)],
    current_user: User = Depends(get_current_active_user),
):
    job = session.get(ImportJob, import_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import not found")
    # Verify the job belongs to the current user
    if job.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this import")
    try:
        items = build_grocery_list(job)
        return GroceryListResponse(items=items, recipe_title=job.parsed_recipe.get("title") if job.parsed_recipe else "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
