from app.schemas import GroceryItem, Recipe


def test_recipe_validation():
    recipe = Recipe(
        title="Test",
        ingredients=[{"name": "salt", "quantity": 1, "unit": "tsp"}],
        steps=[{"order": 1, "instruction": "mix"}],
    )
    assert recipe.title == "Test"
    assert recipe.ingredients[0].unit == "tsp"


def test_grocery_item_defaults():
    item = GroceryItem(name="onion")
    assert item.checked is False
    assert item.quantity is None

