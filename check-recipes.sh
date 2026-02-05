#!/bin/bash

# Diagnostic script to check why recipes aren't showing up
# Run this from the project root: bash check-recipes.sh

echo "=== Recipe Import Diagnostic Script ==="
echo ""

# Check if Docker is running
echo "1. Checking Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Check if backend is running
echo "2. Checking backend API..."
HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$HEALTH" ]; then
    echo "❌ Backend API is not responding at http://localhost:8000"
    echo "   Start it with: cd infra && docker compose up -d"
    exit 1
fi
echo "✅ Backend API is running"
echo "   Response: $HEALTH"
echo ""

# Check database connection
echo "3. Checking database connection..."
DB_CHECK=$(docker exec infra-db-1 psql -U postgres -d recipes -t -c "SELECT 1;" 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to database"
    echo "   Check: docker compose ps"
    exit 1
fi
echo "✅ Database is accessible"
echo ""

# Get all user IDs in database
echo "4. User IDs in database:"
docker exec infra-db-1 psql -U postgres -d recipes -c \
  "SELECT DISTINCT user_id, COUNT(*) as recipe_count FROM import_jobs GROUP BY user_id ORDER BY recipe_count DESC;" 2>/dev/null
echo ""

# Get recipes with parsed_recipe
echo "5. Recipes with parsed_recipe (these should appear in the list):"
docker exec infra-db-1 psql -U postgres -d recipes -c \
  "SELECT id, user_id, 
          CASE WHEN parsed_recipe IS NOT NULL THEN 'YES' ELSE 'NO' END as has_parsed,
          CASE WHEN adapted_recipe IS NOT NULL THEN 'YES' ELSE 'NO' END as has_adapted,
          created_at 
   FROM import_jobs 
   WHERE parsed_recipe IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 10;" 2>/dev/null
echo ""

# Get recipes without parsed_recipe
echo "6. Recipes WITHOUT parsed_recipe (these won't appear in the list):"
docker exec infra-db-1 psql -U postgres -d recipes -c \
  "SELECT id, user_id, status, created_at 
   FROM import_jobs 
   WHERE parsed_recipe IS NULL 
   ORDER BY created_at DESC 
   LIMIT 10;" 2>/dev/null
echo ""

# Test the recipes endpoint
echo "7. Testing /recipes endpoint (replace USER_ID with actual user ID from above):"
echo "   Example: curl 'http://localhost:8000/recipes?user_id=anon-xxxxx'"
echo ""

# Summary
echo "=== Summary ==="
TOTAL=$(docker exec infra-db-1 psql -U postgres -d recipes -t -c "SELECT COUNT(*) FROM import_jobs;" 2>/dev/null | tr -d ' ')
WITH_PARSED=$(docker exec infra-db-1 psql -U postgres -d recipes -t -c "SELECT COUNT(*) FROM import_jobs WHERE parsed_recipe IS NOT NULL;" 2>/dev/null | tr -d ' ')
echo "Total import jobs: $TOTAL"
echo "Recipes with parsed_recipe (will show in list): $WITH_PARSED"
echo "Recipes without parsed_recipe (won't show): $((TOTAL - WITH_PARSED))"
echo ""
echo "If recipes aren't showing:"
echo "  1. Check the user_id in the app matches a user_id in the database"
echo "  2. Ensure recipes have been extracted (parsed_recipe is not NULL)"
echo "  3. Check browser/device console for API errors"
echo "  4. Verify EXPO_PUBLIC_API_BASE_URL is set correctly (or using default)"
