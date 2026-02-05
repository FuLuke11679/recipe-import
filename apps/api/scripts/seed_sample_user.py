#!/usr/bin/env python3
"""
Seed script to create a sample user with existing recipes.

Usage:
    python scripts/seed_sample_user.py

This creates:
    - Username: demo
    - Password: demo123
    - Email: demo@cooked.app
    - Several sample recipes with parsed_recipe data
"""

import sys
import os
from uuid import uuid4
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_session
from app.models import User, ImportJob
from app.auth import get_password_hash
from app.schemas import ImportStatus


def seed_sample_user():
    """Create a sample user with recipes."""
    with get_session() as session:
        # Check if demo user already exists
        existing_user = session.query(User).filter(User.username == "demo").first()
        if existing_user:
            print(f"Demo user already exists with ID: {existing_user.id}")
            user_id = str(existing_user.id)
        else:
            # Create demo user
            demo_user = User(
                email="demo@cooked.app",
                username="demo",
                hashed_password=get_password_hash("demo123"),
                is_active=True,
            )
            session.add(demo_user)
            session.commit()
            session.refresh(demo_user)
            user_id = str(demo_user.id)
            print(f"Created demo user: {demo_user.username} (ID: {user_id})")

        # Check if recipes already exist for this user
        existing_recipes = session.query(ImportJob).filter(
            ImportJob.user_id == user_id,
            ImportJob.parsed_recipe.isnot(None)
        ).count()
        
        if existing_recipes > 0:
            print(f"User already has {existing_recipes} recipes. Skipping recipe creation.")
            return

        # Sample recipes data
        sample_recipes = [
            {
                "url": "https://www.tiktok.com/@chefzealand/video/7258038834670144810",
                "status": ImportStatus.ADAPTED,
                "import_metadata": {
                    "title": "Mac and Cheese",
                    "author_name": "Chef Zealand",
                    "description": "Creamy mac and cheese recipe",
                },
                "parsed_recipe": {
                    "title": "Mac and Cheese",
                    "ingredients": [
                        {"name": "Butter", "quantity": 0.33, "unit": "cup"},
                        {"name": "Flour", "quantity": 0.33, "unit": "cup"},
                        {"name": "Whole milk", "quantity": 3.0, "unit": "cups"},
                        {"name": "Cheddar cheese", "quantity": 2.0, "unit": "cups"},
                        {"name": "Pasta", "quantity": 2.0, "unit": "pounds"},
                    ],
                    "steps": [
                        {"order": 1, "instruction": "Melt butter in a pot"},
                        {"order": 2, "instruction": "Add flour and cook for 1 minute"},
                        {"order": 3, "instruction": "Slowly add milk while whisking"},
                        {"order": 4, "instruction": "Add cheese and stir until melted"},
                        {"order": 5, "instruction": "Mix in cooked pasta"},
                    ],
                    "servings": 8,
                },
                "adapted_recipe": {
                    "title": "Vegan Mac and Cheese",
                    "ingredients": [
                        {"name": "Vegan butter", "quantity": 0.33, "unit": "cup"},
                        {"name": "Flour", "quantity": 0.33, "unit": "cup"},
                        {"name": "Almond milk", "quantity": 3.0, "unit": "cups"},
                        {"name": "Vegan cheddar", "quantity": 2.0, "unit": "cups"},
                        {"name": "Pasta", "quantity": 1.0, "unit": "pound"},
                    ],
                    "steps": [
                        {"order": 1, "instruction": "Melt vegan butter in a pot"},
                        {"order": 2, "instruction": "Add flour and cook for 1 minute"},
                        {"order": 3, "instruction": "Slowly add almond milk while whisking"},
                        {"order": 4, "instruction": "Add vegan cheese and stir until melted"},
                        {"order": 5, "instruction": "Mix in cooked pasta"},
                    ],
                    "servings": 4,
                },
                "change_summary": "Adapted to vegan: replaced dairy with plant-based alternatives and reduced servings to 4",
            },
            {
                "url": "https://www.tiktok.com/@recipe/video/1234567890",
                "status": ImportStatus.EXTRACTED,
                "import_metadata": {
                    "title": "Chocolate Chip Cookies",
                    "author_name": "Baker",
                },
                "parsed_recipe": {
                    "title": "Chocolate Chip Cookies",
                    "ingredients": [
                        {"name": "Flour", "quantity": 2.5, "unit": "cups"},
                        {"name": "Butter", "quantity": 1.0, "unit": "cup"},
                        {"name": "Sugar", "quantity": 0.75, "unit": "cup"},
                        {"name": "Brown sugar", "quantity": 0.75, "unit": "cup"},
                        {"name": "Eggs", "quantity": 2.0, "unit": None},
                        {"name": "Chocolate chips", "quantity": 2.0, "unit": "cups"},
                    ],
                    "steps": [
                        {"order": 1, "instruction": "Preheat oven to 375°F"},
                        {"order": 2, "instruction": "Cream butter and sugars"},
                        {"order": 3, "instruction": "Add eggs and vanilla"},
                        {"order": 4, "instruction": "Mix in flour"},
                        {"order": 5, "instruction": "Stir in chocolate chips"},
                        {"order": 6, "instruction": "Bake for 9-11 minutes"},
                    ],
                    "servings": 24,
                },
            },
            {
                "url": "https://www.tiktok.com/@chef/video/9876543210",
                "status": ImportStatus.EXTRACTED,
                "import_metadata": {
                    "title": "Caesar Salad",
                    "author_name": "Chef",
                },
                "parsed_recipe": {
                    "title": "Caesar Salad",
                    "ingredients": [
                        {"name": "Romaine lettuce", "quantity": 1.0, "unit": "head"},
                        {"name": "Parmesan cheese", "quantity": 0.5, "unit": "cup"},
                        {"name": "Croutons", "quantity": 1.0, "unit": "cup"},
                        {"name": "Caesar dressing", "quantity": 0.5, "unit": "cup"},
                    ],
                    "steps": [
                        {"order": 1, "instruction": "Wash and chop romaine lettuce"},
                        {"order": 2, "instruction": "Add parmesan and croutons"},
                        {"order": 3, "instruction": "Toss with caesar dressing"},
                    ],
                    "servings": 4,
                },
            },
        ]

        # Create sample recipes
        base_time = datetime.utcnow()
        for i, recipe_data in enumerate(sample_recipes):
            job = ImportJob(
                id=uuid4(),
                user_id=user_id,
                url=recipe_data["url"],
                status=recipe_data["status"],
                import_metadata=recipe_data["import_metadata"],
                parsed_recipe=recipe_data["parsed_recipe"],
                adapted_recipe=recipe_data.get("adapted_recipe"),
                change_summary=recipe_data.get("change_summary"),
                created_at=base_time - timedelta(days=i),
                updated_at=base_time - timedelta(days=i),
            )
            session.add(job)
        
        session.commit()
        print(f"Created {len(sample_recipes)} sample recipes for demo user")
        print("\n✅ Sample user seeded successfully!")
        print(f"   Username: demo")
        print(f"   Password: demo123")
        print(f"   Email: demo@cooked.app")


if __name__ == "__main__":
    seed_sample_user()
