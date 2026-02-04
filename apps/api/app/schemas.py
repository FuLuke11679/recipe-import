from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, validator


class ImportStatus(str, Enum):
    CREATED = "CREATED"
    FETCHING_METADATA = "FETCHING_METADATA"
    METADATA_READY = "METADATA_READY"
    AWAITING_RECIPE_TEXT = "AWAITING_RECIPE_TEXT"
    EXTRACTING = "EXTRACTING"
    EXTRACTED = "EXTRACTED"
    ADAPTING = "ADAPTING"
    ADAPTED = "ADAPTED"
    FAILED = "FAILED"


class Ingredient(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None

    @validator("unit")
    def normalize_unit(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.lower()
        return v


class Step(BaseModel):
    order: int
    instruction: str


class Nutrition(BaseModel):
    calories_per_serving: Optional[float] = None
    total_calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None


class Recipe(BaseModel):
    title: str
    ingredients: List[Ingredient]
    steps: List[Step]
    servings: Optional[int] = None
    total_time_minutes: Optional[int] = None
    source_url: Optional[str] = None
    nutrition: Optional[Nutrition] = None
    rating: Optional[float] = Field(default=None, ge=0, le=5, description="User rating from 0 to 5")


class GroceryItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    checked: bool = False


class Constraints(BaseModel):
    diet: Optional[str] = Field(default="none")
    max_time: Optional[int] = Field(default=None, description="Max cook time in minutes")
    servings: Optional[int] = None
    allergies: Optional[str] = None
    max_calories_per_serving: Optional[int] = Field(default=None, description="Max calories per serving")
    min_protein_g: Optional[float] = Field(default=None, description="Minimum protein in grams per serving")


class ImportCreateRequest(BaseModel):
    url: HttpUrl
    # user_id is now taken from authenticated user, not from request


class ImportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    url: HttpUrl
    status: ImportStatus
    metadata: Optional[dict] = Field(default=None, alias="import_metadata")
    raw_recipe_text: Optional[str] = None
    parsed_recipe: Optional[Recipe] = None
    adapted_recipe: Optional[Recipe] = None
    change_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RecipeTextRequest(BaseModel):
    text: str


class ExtractRequest(BaseModel):
    prompt_override: Optional[str] = None


class AdaptRequest(BaseModel):
    constraints: Constraints
    create_new: bool = False


class GroceryListResponse(BaseModel):
    items: List[GroceryItem]
    recipe_title: str


class RatingRequest(BaseModel):
    rating: float = Field(ge=0, le=5, description="Rating from 0 to 5")


# Authentication schemas
class UserRegister(BaseModel):
    email: str
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

