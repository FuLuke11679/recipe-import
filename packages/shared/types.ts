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

export type Recipe = {
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  servings?: number | null;
  total_time_minutes?: number | null;
  source_url?: string | null;
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
