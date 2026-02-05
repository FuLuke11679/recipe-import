# Troubleshooting: Save Recipe & Recipe List Issues

This document covers setup and external issues that could prevent the Save Recipe button from working or recipes from appearing in the list.

## Critical Setup Issues

### 1. **User ID Persistence (Web Platform)**

**Problem:** On web, the anonymous user ID is generated in-memory and not persisted. This means:
- Each page refresh generates a new user ID
- Recipes saved with one user ID won't appear when using a different user ID
- This is the most common cause of "recipes not showing up"

**Solution:**
- **For testing:** Use Android emulator or physical device where SecureStore persists the user ID
- **For web development:** The user ID should persist during the session, but will reset on page refresh
- **Check:** Open browser DevTools → Application → Local Storage → Look for `anon_user_id` (it won't be there on web)

**How to verify:**
```javascript
// In browser console or add temporary logging
console.log("Current user ID:", await SecureStore.getItemAsync("anon_user_id"));
```

### 2. **Backend API Not Running**

**Problem:** If the backend isn't running, all API calls will fail silently or show network errors.

**Check:**
```bash
# Verify backend is running
curl http://localhost:8000/health
# Should return: {"status":"ok","environment":"development"}

# Check Docker containers
cd infra
docker compose ps
# Should show: api, db, redis all as "Up"
```

**Fix:**
```bash
cd infra
docker compose up -d
```

### 3. **Database Connection Issues**

**Problem:** Backend might be running but can't connect to the database, so recipes aren't actually saved.

**Check:**
```bash
# View backend logs
cd infra
docker compose logs api

# Check for database connection errors
docker compose logs api | grep -i "database\|postgres\|connection"
```

**Fix:**
```bash
# Restart database
docker compose restart db

# Run migrations (if needed)
cd apps/api
alembic upgrade head
```

### 4. **API Base URL Configuration**

**Problem:** Mobile app might be pointing to wrong API URL.

**Check:**
- Android emulator should use: `http://10.0.2.2:8000` (automatic)
- iOS simulator should use: `http://localhost:8000` (automatic)
- Web should use: `http://localhost:8000` (automatic)
- Physical device should use: Your computer's IP address (e.g., `http://192.168.1.100:8000`)

**Fix:**
```bash
# Set environment variable for physical device
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_IP:8000 npx expo start
```

**How to find your computer's IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

### 5. **Recipe Not Actually Extracted**

**Problem:** The `/recipes` endpoint only returns recipes with `parsed_recipe.isnot(None)`. If extraction failed or hasn't completed, the recipe won't appear in the list.

**Check:**
```bash
# Query the database directly
docker exec -it infra-db-1 psql -U postgres -d recipes
# Then:
SELECT id, user_id, status, parsed_recipe IS NOT NULL as has_parsed, 
       adapted_recipe IS NOT NULL as has_adapted, created_at 
FROM import_jobs 
ORDER BY created_at DESC 
LIMIT 5;
```

**Verify in app:**
- Check RecipeView screen - does it show ingredients and steps?
- If not, the recipe hasn't been extracted yet
- Click "Extract Recipe" button if available

### 6. **User ID Mismatch**

**Problem:** Recipe was saved with one user ID, but you're querying with a different user ID.

**Check:**
```bash
# In database
SELECT DISTINCT user_id FROM import_jobs;
# Compare with what the app is using
```

**How to verify in app:**
- Add temporary logging in `useAnonId.ts`:
```typescript
console.log("Current user ID:", id);
```
- Check browser console or React Native debugger
- Ensure the same user ID is used for both saving and fetching

### 7. **Network/Firewall Issues**

**Problem:** Firewall or network configuration blocking API calls.

**Check:**
```bash
# Test API from mobile device/emulator
# On Android emulator:
adb shell
curl http://10.0.2.2:8000/health

# On physical device (replace with your IP):
curl http://YOUR_IP:8000/health
```

**Fix:**
- Disable firewall temporarily for testing
- Ensure backend is bound to `0.0.0.0` (not just `localhost`)
- Check Docker port mapping: `8000:8000` in docker-compose.yml

### 8. **React Query Cache Issues**

**Problem:** React Query might be caching stale data.

**Fix:**
- Clear app cache: Close and reopen the app
- Force refresh: Pull down on recipe list (if pull-to-refresh implemented)
- Check React Query DevTools (if installed) for cache state

### 9. **CORS Issues (Web Only)**

**Problem:** Browser blocking API requests due to CORS.

**Check:**
- Open browser DevTools → Network tab
- Look for failed requests with CORS errors
- Check backend CORS configuration in `apps/api/app/main.py`

**Fix:**
- Backend already has CORS middleware allowing all origins
- If issues persist, check browser console for specific CORS errors

### 10. **Database Not Initialized**

**Problem:** Database tables might not exist.

**Check:**
```bash
# Connect to database
docker exec -it infra-db-1 psql -U postgres -d recipes

# Check if tables exist
\dt

# Should show: import_jobs table
```

**Fix:**
```bash
cd apps/api
alembic upgrade head
```

## Debugging Steps

### Step 1: Verify Backend is Running
```bash
curl http://localhost:8000/health
```

### Step 2: Check User ID Consistency
Add logging to see what user ID is being used:
```typescript
// In RecipeView.tsx, before saveRecipeMutation
console.log("Save Recipe - Current user ID:", userId);
console.log("Save Recipe - Import ID:", importId);
```

### Step 3: Verify Recipe Extraction
```bash
# Check if recipe has parsed_recipe
curl http://localhost:8000/imports/{importId}
# Look for "parsed_recipe" field - should not be null
```

### Step 4: Test Recipe List Endpoint Directly
```bash
# Replace {userId} with actual user ID from app logs
curl "http://localhost:8000/recipes?user_id={userId}"
# Should return array of recipes with parsed_recipe
```

### Step 5: Check Network Requests
- Open React Native Debugger or browser DevTools
- Go to Network tab
- Trigger "Save Recipe" action
- Check if request succeeds (status 200)
- Check response body

### Step 6: Verify Database State
```bash
docker exec -it infra-db-1 psql -U postgres -d recipes -c \
  "SELECT id, user_id, parsed_recipe IS NOT NULL as has_parsed, created_at FROM import_jobs ORDER BY created_at DESC LIMIT 10;"
```

## Common Error Messages

### "Recipe not yet extracted"
- **Cause:** Recipe extraction hasn't completed
- **Fix:** Click "Extract Recipe" button first, then save

### "Failed to save recipe"
- **Cause:** Network error or backend not responding
- **Fix:** Check backend is running, check network connection

### Recipe list is empty
- **Cause:** 
  1. No recipes extracted yet
  2. User ID mismatch
  3. Backend not returning recipes
- **Fix:** Follow debugging steps above

### "Request failed: 404"
- **Cause:** API endpoint doesn't exist or import ID is wrong
- **Fix:** Check import ID is correct, verify backend routes

### "Request failed: 500"
- **Cause:** Backend server error
- **Fix:** Check backend logs: `docker compose logs api`

## Quick Diagnostic Script

Run this to check all common issues:

```bash
#!/bin/bash
echo "1. Checking backend health..."
curl -s http://localhost:8000/health || echo "❌ Backend not running"

echo "2. Checking Docker containers..."
docker compose ps

echo "3. Checking database connection..."
docker exec infra-db-1 psql -U postgres -d recipes -c "SELECT COUNT(*) FROM import_jobs;" || echo "❌ Database not accessible"

echo "4. Checking recent recipes..."
docker exec infra-db-1 psql -U postgres -d recipes -c \
  "SELECT id, user_id, parsed_recipe IS NOT NULL as has_parsed, created_at FROM import_jobs ORDER BY created_at DESC LIMIT 5;"
```

Save as `check-setup.sh` in project root and run: `bash check-setup.sh`
