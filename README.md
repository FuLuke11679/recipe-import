# Recipe Import MVP

Share a TikTok → import recipe → adapt recipe → grocery list.

## Structure
- `apps/api`: FastAPI backend (Postgres, Redis/RQ)
- `apps/mobile`: Expo React Native app (Android focused)
- `packages/shared`: Shared TypeScript types aligned with backend schemas
- `infra/docker-compose.yml`: Local stack (api, postgres, redis)

## Prerequisites

### Required
- **Docker Desktop**: For running the backend stack (Postgres, Redis, API)
- **Node.js** (v18+): For running the mobile app
- **npm** or **yarn**: Package manager

### For Android Development
- **Android Studio**: Install and set up an Android Virtual Device (AVD)
- **Android SDK**: Usually installed with Android Studio
- **ADB** (Android Debug Bridge): Add to PATH (see setup below)

### Setup Android SDK Tools (One-time)

If you haven't already, add Android SDK tools to your PATH:

**On macOS (zsh):**
```bash
# Add to ~/.zshrc
echo 'export PATH=$PATH:$HOME/Library/Android/sdk/platform-tools' >> ~/.zshrc
echo 'export PATH=$PATH:$HOME/Library/Android/sdk/emulator' >> ~/.zshrc

# Reload your shell
source ~/.zshrc
```

**Verify:**
```bash
adb --version
emulator -list-avds
```

### API Keys Setup (Optional but Recommended)

For full functionality, set up API keys. The app will work with stub implementations if keys are not provided.

**Create `.env` file in project root:**
```bash
# In /Users/owner/Documents/recipe-import/.env
APP_OPENAI_API_KEY=sk-your-openai-api-key-here
APP_SCRAPECREATORS_API_KEY=your-scrapecreators-api-key-here
```

**Get API Keys:**
- **OpenAI API Key**: Sign up at https://platform.openai.com/api-keys
  - Used for recipe extraction and adaptation
  - Costs apply per API call (see pricing at https://openai.com/pricing)
  - Recommended model: `gpt-3.5-turbo` (cost-effective) or `gpt-4` (higher quality)

**TikTok Scraping:**
- TikTok metadata (caption, title, author) is extracted via scrapecreators API
- Set `APP_SCRAPECREATORS_API_KEY` in `.env` file with your scrapecreators API key
- Falls back to mock data if API key not set or API call fails

**Note:** The `.env` file is gitignored and won't be committed. Without the OpenAI API key, the app uses stub implementations that provide basic functionality but with limited intelligence.

## Quickstart

### 1. Start Backend Stack

```bash
cd infra
docker compose up -d
```

**Verify backend is running:**
```bash
# Check containers
docker compose ps

# Test health endpoint
curl http://localhost:8000/health
# Should return: {"status":"ok","environment":"development"}
```

API is available at:
- **Base URL**: http://localhost:8000
- **Health**: http://localhost:8000/health
- **Docs**: http://localhost:8000/docs (Swagger UI)

**Stop backend:**
```bash
cd infra
docker compose down
```

### 2. Install Mobile App Dependencies

```bash
cd apps/mobile
npm install
```

### 3. Run Mobile App

#### Option A: Web (Easiest for Testing)

```bash
cd apps/mobile
npx expo start --web
```

The app will open automatically in your browser at `http://localhost:8081`.

#### Option B: Android Emulator

**Step 1: Start Android Emulator**

Via Android Studio:
1. Open Android Studio
2. Go to **Tools → Device Manager**
3. Click the **Play** button next to your emulator (e.g., `Medium_Phone_API_36.1`)
4. Wait for emulator to boot (30-60 seconds)

Or via command line:
```bash
emulator -avd Medium_Phone_API_36.1
```

**Step 2: Verify Emulator is Connected**
```bash
adb devices
# Should show: emulator-5554    device
```

**Step 3: Start Expo**
```bash
cd apps/mobile
npx expo start
```

**Step 4: Open on Android**
- Press `a` in the Expo terminal, or
- The app should automatically connect when emulator is ready

#### Option C: Physical Android Device

1. Enable **Developer Options** on your Android device
2. Enable **USB Debugging**
3. Connect device via USB
4. Verify connection: `adb devices`
5. Run `npx expo start` and press `a`

### 4. Testing the App

#### Web Testing

1. Open the app in your browser (usually automatic when running `npx expo start --web`)
2. You should see the **Home** screen with "Share a TikTok → Import recipe"
3. **Test Paste & Import:**
   - Paste a TikTok URL in the text field (e.g., `https://www.tiktok.com/@user/video/123456`)
   - Click **"Import"** button
   - You should navigate to the **ImportPreview** screen showing the job status

4. **Test Full Flow:**
   - From ImportPreview, click **"Paste Recipe"**
   - Paste raw recipe text
   - Click **"Extract"** to parse the recipe
   - View the extracted recipe
   - Click **"Adapt"** to modify with constraints (diet, time, servings, allergies)
   - View the adapted recipe and changes summary
   - Click **"Grocery List"** to see the shopping list

#### Android Testing

1. Ensure emulator is running and connected (`adb devices`)
2. Start Expo: `npx expo start`
3. Press `a` to open on Android
4. Test the same flow as web testing above

**Note:** For Android emulator, the app automatically uses `http://10.0.2.2:8000` to access the host machine's `localhost:8000`.

## Application Flow

1. **Home Screen**: Paste or deep-link a TikTok URL → creates ImportJob (idempotent within 24h)
2. **ImportPreview Screen**: Shows job status and metadata from TikTok
3. **PasteRecipe Screen**: Paste raw recipe text → submit to backend
4. **RecipeView Screen**: View extracted structured recipe (title, ingredients, steps)
5. **Adapt Screen**: Modify recipe with constraints:
   - Diet (vegetarian, vegan, gluten-free)
   - Max time
   - Servings
   - Allergies
6. **GroceryList Screen**: View normalized grocery list with checkboxes and share functionality

## Development

### Backend Development

**Run tests:**
```bash
cd apps/api
pytest
```

**Run with hot reload:**
```bash
cd apps/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Run database migrations:**
```bash
cd apps/api
alembic upgrade head
```

**Access database:**
```bash
docker exec -it infra-postgres-1 psql -U postgres -d recipe_import
```

### Mobile Development

**Clear Metro bundler cache:**
```bash
cd apps/mobile
npx expo start -c
```

**Check for dependency updates:**
```bash
cd apps/mobile
npx expo install --check
```

## Troubleshooting

### Backend Issues

**Backend not starting:**
- Check Docker is running: `docker ps`
- Check ports aren't in use: `lsof -i :8000` (or `:5432`, `:6379`)
- View logs: `cd infra && docker compose logs`

**Database connection errors:**
- Ensure Postgres container is running: `docker compose ps`
- Check database is initialized: `docker compose logs postgres`

### Mobile App Issues

**Android emulator not connecting:**
- Verify emulator is running: `adb devices`
- Restart ADB server: `adb kill-server && adb start-server`
- Check emulator is fully booted (wait for Android home screen)

**"command not found: adb" or "command not found: emulator":**
- Ensure Android SDK tools are in PATH (see Prerequisites)
- Source your shell config: `source ~/.zshrc` (or `~/.bash_profile`)
- Or close and reopen your terminal

**App can't connect to backend:**
- Verify backend is running: `curl http://localhost:8000/health`
- For Android emulator, backend should be at `http://10.0.2.2:8000` (handled automatically)
- For web, backend should be at `http://localhost:8000` (handled automatically)

**Metro bundler errors:**
- Clear cache: `npx expo start -c`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## API Endpoints

- `POST /imports` - Create a new import job
- `GET /imports/{id}` - Get import job details
- `POST /imports/{id}/recipe_text` - Submit recipe text
- `POST /imports/{id}/extract` - Extract structured recipe
- `POST /imports/{id}/adapt` - Adapt recipe with constraints
- `GET /imports/{id}/grocery_list` - Get grocery list

See full API docs at http://localhost:8000/docs

## Known Limitations / TODO

- iOS share extension not implemented (documented only)
- LLM provider supports real OpenAI API but falls back to stubs if API key not configured:
  - Set `APP_OPENAI_API_KEY` in `.env` file for recipe extraction/adaptation
  - Without key, stub implementations provide basic functionality
- TikTok metadata uses scrapecreators API:
  - Set `APP_SCRAPECREATORS_API_KEY` in `.env` file
  - Extracts caption, title, and author from TikTok videos
  - Falls back to mock data if API key not set or API call fails
- Minimal styling; production hardening pending:
  - Authentication/authorization
  - Rate limiting
  - Analytics (PostHog hooks are stubbed)
  - Error tracking (Sentry hooks are stubbed)
- Android share intent deep linking needs additional testing
- Web version works but some native features (SecureStore) use fallbacks
