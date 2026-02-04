export type ImportStatus =
  | "CREATED"
  | "FETCHING_METADATA"
  | "METADATA_READY"
  | "AWAITING_RECIPE_TEXT"
  | "EXTRACTING"
  | "EXTRACTED"
  | "ADAPTING"
  | "ADAPTED"
  | "FAILED";

export type Ingredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
};

export type Step = {
  order: number;
  instruction: string;
};

export type Nutrition = {
  calories_per_serving?: number | null;
  total_calories?: number | null;
  protein_g?: number | null;
  carbohydrates_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
};

export type Recipe = {
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  servings?: number | null;
  total_time_minutes?: number | null;
  source_url?: string | null;
  nutrition?: Nutrition | null;
  rating?: number | null;
};

export type GroceryItem = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  checked: boolean;
};

export type Constraints = {
  diet?: "none" | "vegetarian" | "vegan" | "gluten-free" | string | null;
  max_time?: number | null;
  servings?: number | null;
  allergies?: string | null;
  max_calories_per_serving?: number | null;
  min_protein_g?: number | null;
};

export type ImportJob = {
  id: string;
  user_id: string;
  url: string;
  status: ImportStatus;
  metadata?: Record<string, unknown> | null;
  raw_recipe_text?: string | null;
  parsed_recipe?: Recipe | null;
  adapted_recipe?: Recipe | null;
  change_summary?: string | null;
  created_at: string;
  updated_at: string;
};
