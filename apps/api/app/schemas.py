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


class Recipe(BaseModel):
    title: str
    ingredients: List[Ingredient]
    steps: List[Step]
    servings: Optional[int] = None
    total_time_minutes: Optional[int] = None
    source_url: Optional[str] = None


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


class ImportCreateRequest(BaseModel):
    url: HttpUrl
    user_id: str


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


class GroceryListResponse(BaseModel):
    items: List[GroceryItem]
    recipe_title: str

