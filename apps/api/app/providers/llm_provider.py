from typing import Dict

from ..schemas import Constraints, Recipe


def extract_recipe(text: str) -> Dict:
    """Stub LLM extractor that produces a naive recipe from free text."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = lines[0] if lines else "Untitled Recipe"
    ingredients = [{"name": line, "quantity": None, "unit": None, "notes": None} for line in lines[1:6]]
    steps = [{"order": idx + 1, "instruction": line} for idx, line in enumerate(lines[6:11])]
    return Recipe(
        title=title,
        ingredients=ingredients or [{"name": "ingredient", "quantity": None, "unit": None, "notes": None}],
        steps=steps or [{"order": 1, "instruction": "Follow instructions."}],
    ).model_dump()


def adapt_recipe(recipe: Recipe, constraints: Constraints) -> Dict:
    """Stub adaptation that annotates the recipe with constraint info."""
    summary_parts = []
    if constraints.diet and constraints.diet != "none":
        summary_parts.append(f"Adjusted for diet: {constraints.diet}")
    if constraints.max_time:
        summary_parts.append(f"Target max time: {constraints.max_time} min")
    if constraints.servings:
        summary_parts.append(f"Adjusted servings to {constraints.servings}")
    if constraints.allergies:
        summary_parts.append(f"Avoiding: {constraints.allergies}")

    summary = "; ".join(summary_parts) or "No changes applied."
    adapted = recipe.model_copy()
    if constraints.servings:
        adapted.servings = constraints.servings
    return adapted.model_dump(), summary

