import json
import logging
from typing import Dict, Optional, Tuple

from openai import OpenAI

from ..config import get_settings
from ..schemas import Constraints, Recipe

logger = logging.getLogger(__name__)


def _get_openai_client() -> Optional[OpenAI]:
    """Get OpenAI client if API key is configured, otherwise return None."""
    settings = get_settings()
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def _stub_extract_recipe(text: str) -> Dict:
    """Fallback stub extractor that produces a naive recipe from free text."""
    import re
    
    # Remove section prefixes like "CAPTION:", "TRANSCRIPT:", "RECIPE TEXT:"
    cleaned_text = re.sub(r"^(CAPTION|TRANSCRIPT|RECIPE TEXT):\s*", "", text, flags=re.MULTILINE | re.IGNORECASE)
    
    # Extract title - look for recipe name before "Ingredients:" keyword
    title = "Untitled Recipe"
    
    # Remove emojis and clean up
    text_for_title = re.sub(r"[😤🔥💯✨⭐🌟]", "", cleaned_text)
    
    # Always define lines for later use
    lines = [line.strip() for line in text_for_title.splitlines() if line.strip()]
    
    if "Ingredients:" in text_for_title:
        # Title is usually before "Ingredients:"
        title_part = text_for_title.split("Ingredients:")[0].strip()
        # Take first sentence, remove emojis, limit length
        if title_part:
            # Split by sentence endings
            sentences = re.split(r"[.!?]\s+", title_part)
            if sentences:
                title = sentences[0].strip()
                # Remove common prefixes
                title = re.sub(r"^(Mac and Cheese|Recipe|How to make|How to cook)\s*", "", title, flags=re.IGNORECASE)
                # Limit to 60 chars
                if len(title) > 60:
                    title = title[:57] + "..."
            if not title or len(title) < 3:
                title = "Untitled Recipe"
    else:
        # Try to get title from first meaningful line
        for line in lines[:3]:
            if not line.startswith(("CAPTION", "TRANSCRIPT", "RECIPE TEXT", "#", "Ingredients:")) and len(line) > 5:
                title = line.split(".")[0].split("😤")[0].strip()[:60]
                break
    
    # Fallback: try common recipe names
    if not title or title == "Untitled Recipe" or len(title) > 100:
        if "Mac and Cheese" in cleaned_text or "mac and cheese" in cleaned_text.lower():
            title = "Mac and Cheese"
        elif "pasta" in cleaned_text.lower():
            title = "Pasta Recipe"
        else:
            # Try to find capitalized words (likely recipe name)
            match = re.search(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b", cleaned_text[:200])
            if match and len(match.group(1)) < 50:
                title = match.group(1)
            else:
                title = "Untitled Recipe"
    
    # Extract ingredients section
    ingredient_text = cleaned_text
    if "Ingredients:" in ingredient_text:
        ingredient_text = ingredient_text.split("Ingredients:")[-1]
    if "ingredients:" in ingredient_text:
        ingredient_text = ingredient_text.split("ingredients:")[-1]
    
    # Remove hashtags and emojis from ingredient text
    ingredient_text = re.sub(r"#\w+", "", ingredient_text)
    ingredient_text = re.sub(r"[😤🔥💯✨⭐🌟]", "", ingredient_text)
    
    ingredients = []
    
    # Pattern 1: Try to match "quantity unit ingredient" pattern
    # Handles: "1/3 cup Butter", "1 1/2 tbsp garlic powder", "2 cups Mild-Medium Cheddar", "2 pounds pasta"
    # Updated pattern to handle ingredients that might be on the same line
    ingredient_pattern = r"(\d+(?:\s+\d+/\d+)?(?:\s*/\s*\d+)?|~?\s*\d+\s*-\s*\d+)\s*(cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|pounds|g|gram|grams|kg|kilogram|ml|milliliter|l|liter|piece|pieces|slice|slices|clove|cloves|can|cans|package|packages)\s+([A-Z][A-Za-z\s\-]+?)(?=\s+\d+\s*(?:cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|pounds|slice|slices|pound|pounds)|~|#|$|(?:Salt|Pepper|to taste))"
    
    ingredient_matches = re.finditer(ingredient_pattern, ingredient_text, re.IGNORECASE | re.MULTILINE)
    for match in list(ingredient_matches)[:30]:  # Limit to 30 ingredients
        quantity_str = match.group(1).strip().replace("~", "").strip()
        unit = match.group(2).lower()
        name = match.group(3).strip()
        
        # Clean up name (remove extra spaces, trailing punctuation, parenthetical notes)
        name = re.sub(r"\s+", " ", name).strip(" ,.")
        # Extract notes from parentheses
        notes_match = re.search(r"\(([^)]+)\)", name)
        notes = notes_match.group(1) if notes_match else None
        if notes_match:
            name = name.replace(f"({notes})", "").strip()
        
        # Parse quantity (handle fractions, mixed numbers, and ranges)
        quantity = None
        try:
            # Handle ranges like "3-4" - take the average
            if "-" in quantity_str:
                parts = quantity_str.split("-")
                quantity = (float(parts[0]) + float(parts[1])) / 2
            # Handle mixed numbers like "1 1/2"
            elif " " in quantity_str and "/" in quantity_str:
                parts = quantity_str.split()
                whole = float(parts[0])
                fraction_parts = parts[1].split("/")
                fraction = float(fraction_parts[0]) / float(fraction_parts[1])
                quantity = whole + fraction
            # Handle simple fractions like "1/3"
            elif "/" in quantity_str:
                parts = quantity_str.split("/")
                quantity = float(parts[0]) / float(parts[1])
            # Handle whole numbers
            else:
                quantity = float(quantity_str)
        except (ValueError, ZeroDivisionError, IndexError):
            quantity = None
        
        if name and len(name) > 1:  # Only add if we have a valid name
            ingredients.append({
                "name": name,
                "quantity": quantity,
                "unit": unit,
                "notes": notes,
            })
    
    # Pattern 2: If we didn't find many ingredients, try a simpler split approach
    if len(ingredients) < 3:
        # Split by common patterns and try to extract
        parts = re.split(r"(\d+(?:\s+\d+/\d+)?(?:\s*/\s*\d+)?)\s*(cup|cups|tbsp|tsp|tablespoon|teaspoon|oz|ounce|lb|pound|pounds|slice|slices)", ingredient_text, flags=re.IGNORECASE)
        # Process pairs of (quantity, unit, ingredient)
        for i in range(0, len(parts) - 2, 3):
            if i + 2 < len(parts):
                qty_str = parts[i].strip()
                unit = parts[i+1].lower() if i+1 < len(parts) else None
                name = parts[i+2].strip()[:50] if i+2 < len(parts) else None
                
                if name and unit and len(name) > 2:
                    # Parse quantity
                    qty = None
                    try:
                        if "/" in qty_str:
                            p = qty_str.split("/")
                            qty = float(p[0]) / float(p[1])
                        else:
                            qty = float(qty_str)
                    except:
                        pass
                    
                    ingredients.append({
                        "name": name.split()[0] if name else "ingredient",
                        "quantity": qty,
                        "unit": unit,
                        "notes": None,
                    })
    
    # If no ingredients found with pattern, try splitting by common separators
    if not ingredients:
        # Split by commas, semicolons, or "and" for ingredient lists
        ingredient_text = cleaned_text
        if "Ingredients:" in ingredient_text:
            ingredient_text = ingredient_text.split("Ingredients:")[-1]
        if "ingredients:" in ingredient_text:
            ingredient_text = ingredient_text.split("ingredients:")[-1]
        
        # Split by common separators
        potential_ingredients = re.split(r"[,;]|\sand\s", ingredient_text)
        for ing in potential_ingredients[:15]:  # Limit to 15
            ing = ing.strip()
            if ing and len(ing) > 2 and not ing.startswith("#"):  # Skip hashtags
                ingredients.append({
                    "name": ing,
                    "quantity": None,
                    "unit": None,
                    "notes": None,
                })
    
    # If still no ingredients, create a default one
    if not ingredients:
        ingredients = [{"name": "See recipe text for ingredients", "quantity": None, "unit": None, "notes": None}]
    
    # Create simple steps from remaining text
    steps = []
    if len(lines) > 1:
        for idx, line in enumerate(lines[1:6], 1):
            if line and not line.startswith("#"):
                steps.append({"order": idx, "instruction": line})
    
    if not steps:
        steps = [{"order": 1, "instruction": "Follow the recipe instructions from the source."}]
    
    return Recipe(
        title=title,
        ingredients=ingredients,
        steps=steps,
    ).model_dump()


def extract_recipe(text: str) -> Dict:
    """Extract structured recipe data from free text using OpenAI or fallback to stub."""
    client = _get_openai_client()
    if not client:
        logger.info("openai_api_key_not_set", extra={"fallback": "stub"})
        return _stub_extract_recipe(text)

    system_prompt = """You are a recipe extraction assistant. Extract structured recipe data from the provided text.

The text may contain:
- CAPTION: The TikTok video caption (often contains ingredient lists)
- TRANSCRIPT: The spoken transcript from the video (contains cooking instructions and details)
- RECIPE TEXT: Additional recipe text if provided

Use BOTH the caption and transcript to extract the complete recipe. The caption often has ingredient lists, while the transcript has detailed cooking instructions.

CRITICAL: Each ingredient must be a separate object in the ingredients array. Do NOT combine multiple ingredients into one entry.

Return a valid JSON object matching this exact schema:
{
  "title": string (recipe name),
  "ingredients": [
    {
      "name": string (ingredient name ONLY - e.g., "butter", "flour", "milk"),
      "quantity": number | null (amount if specified - e.g., 1.5, 2, 0.5, 0.33 for 1/3),
      "unit": string | null (unit like "cups", "tbsp", "tsp", "g", "oz", "lb" if specified),
      "notes": string | null (optional notes like "melted", "chopped", etc.)
    }
  ],
  "steps": [
    {
      "order": number (1, 2, 3...),
      "instruction": string (step description)
    }
  ],
  "servings": number | null (optional),
  "total_time_minutes": number | null (optional),
  "source_url": string | null (optional)
}

IMPORTANT RULES:
- Each ingredient must be a separate entry in the ingredients array
- Extract quantity as a number (e.g., 1.5, 2, 0.5, 0.33 for 1/3) not as a string
- Extract unit separately from quantity (e.g., "1 cup flour" → quantity: 1, unit: "cup", name: "flour")
- Handle fractions: "1/3 cup" → quantity: 0.33, unit: "cup"
- Handle mixed numbers: "1 1/2 tbsp" → quantity: 1.5, unit: "tbsp"
- If an ingredient has no quantity, set quantity to null
- If an ingredient has no unit, set unit to null
- Parse ingredient names cleanly (remove quantities and units from the name field)
- Use the transcript to extract detailed cooking steps
- Use the caption to extract ingredient lists and recipe title
- Order steps sequentially starting from 1
- Return ONLY valid JSON, no markdown or extra text."""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract recipe data from:\n\n{text}"},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")

        recipe_dict = json.loads(content)
        # Validate using Pydantic model
        recipe = Recipe.model_validate(recipe_dict)
        logger.info("recipe_extracted", extra={"title": recipe.title, "ingredients_count": len(recipe.ingredients)})
        return recipe.model_dump()
    except Exception as exc:  # noqa: BLE001
        logger.warning("openai_extract_failed", extra={"error": str(exc), "fallback": "stub"})
        return _stub_extract_recipe(text)


def _stub_adapt_recipe(recipe: Recipe, constraints: Constraints) -> Tuple[Dict, str]:
    """Fallback stub adaptation that annotates the recipe with constraint info."""
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


def adapt_recipe(recipe: Recipe, constraints: Constraints) -> Tuple[Dict, str]:
    """Adapt recipe based on constraints using OpenAI or fallback to stub."""
    client = _get_openai_client()
    if not client:
        logger.info("openai_api_key_not_set", extra={"fallback": "stub"})
        return _stub_adapt_recipe(recipe, constraints)

    # Build constraints description
    constraint_parts = []
    if constraints.diet and constraints.diet != "none":
        constraint_parts.append(f"Diet: {constraints.diet}")
    if constraints.max_time:
        constraint_parts.append(f"Maximum time: {constraints.max_time} minutes")
    if constraints.servings:
        constraint_parts.append(f"Servings: {constraints.servings}")
    if constraints.allergies:
        constraint_parts.append(f"Allergies to avoid: {constraints.allergies}")

    constraints_text = "; ".join(constraint_parts) if constraint_parts else "No specific constraints"

    system_prompt = """You are a recipe adaptation assistant. Adapt recipes based on dietary constraints, time limits, serving sizes, and allergies.

Return a JSON object with two fields:
1. "recipe": The adapted recipe matching the Recipe schema (same as input schema)
2. "summary": A brief human-readable summary of changes made (2-3 sentences)

When adapting:
- For diet restrictions: substitute ingredients appropriately (e.g., plant-based alternatives for vegan)
- For time constraints: simplify steps, combine or remove time-consuming techniques
- For serving changes: scale ingredient quantities proportionally
- For allergies: replace or remove problematic ingredients with safe alternatives

Return ONLY valid JSON with "recipe" and "summary" fields."""

    recipe_json = json.dumps(recipe.model_dump(), indent=2)

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Adapt this recipe:\n\n{recipe_json}\n\nConstraints: {constraints_text}",
                },
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI")

        result = json.loads(content)
        adapted_dict = result.get("recipe", {})
        summary = result.get("summary", "Recipe adapted based on constraints.")

        # Validate adapted recipe
        adapted_recipe = Recipe.model_validate(adapted_dict)
        logger.info(
            "recipe_adapted",
            extra={
                "title": adapted_recipe.title,
                "constraints": constraints_text,
            },
        )
        return adapted_recipe.model_dump(), summary
    except Exception as exc:  # noqa: BLE001
        logger.warning("openai_adapt_failed", extra={"error": str(exc), "fallback": "stub"})
        return _stub_adapt_recipe(recipe, constraints)

