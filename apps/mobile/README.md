# Cooked Mobile App

React Native mobile app built with Expo for importing and adapting recipes from TikTok videos.

## Tech Stack

- **Expo** (managed workflow)
- **TypeScript**
- **React Navigation** (native stack)
- **React Query** (@tanstack/react-query) for server state
- **Zustand** for lightweight client state
- **expo-secure-store** for anonymous user ID persistence
- **expo-linking** for deep links
- **expo-sharing** for sharing grocery lists

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API base URL:
   - Create a `.env` file in the `apps/mobile` directory
   - Add: `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000`
   - For Android emulator, use: `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`
   - For iOS simulator, use: `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000`

3. Start the development server:
```bash
npm start
```

4. Run on your platform:
```bash
npm run android  # Android
npm run ios       # iOS
npm run web       # Web
```

## Features

### Screens

1. **Launch / Continue** - Initial screen with app branding
2. **Onboarding Flow**:
   - Diet selection (None, Vegetarian, Vegan, Gluten-Free, Keto/Low-Carb)
   - Allergies (Nuts, Dairy, Shellfish, Eggs + custom)
   - Lifestyle (Time availability, Cooking confidence)
   - Goals (optional)
3. **Home** - Import hub with TikTok URL input
4. **Import Preview** - Shows TikTok video metadata and import status
5. **Paste Recipe** - Fallback for manual recipe text entry
6. **Recipe View** - Displays adapted recipe with ingredients and steps
7. **Adapt Modal** - Customize recipe constraints
8. **Adapt Summary** - Shows what changed in the adaptation
9. **Grocery List** - Categorized shopping list with checkboxes
10. **Cooking Prompt** - Start cooking or save for later
11. **Completion Feedback** - Rate difficulty after cooking
12. **Salvage Mode** - Reset week or get one easy meal

### Deep Links & Share Intents

#### Platform Support
- **iOS**: Full support with URL schemes and deep linking
- **Android**: Full support with share intents and deep linking

#### Deep Links
- `recipeimport://import?url=<tiktok_url>` - Opens Import Preview with URL prefilled
- `cooked://import?url=<tiktok_url>` - Alternative deep link format

#### Testing Share Intent

**Android:**
1. Build and install the app on an Android device/emulator
2. Open TikTok app (or browser)
3. Share a TikTok video URL
4. Select "Cooked" from the share menu
5. App should open and navigate to Import Preview with the URL

**iOS:**
1. Build and install the app on an iOS device/simulator
2. Copy a TikTok URL to clipboard or share via share sheet
3. The app will detect TikTok URLs and navigate to Import Preview

#### Testing Deep Links

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "recipeimport://import?url=https://www.tiktok.com/@user/video/123456" com.example.recipeimport
```

**iOS Simulator:**
```bash
xcrun simctl openurl booted "recipeimport://import?url=https://www.tiktok.com/@user/video/123456"
```

**iOS Device:**
Open Safari and navigate to: `recipeimport://import?url=https://www.tiktok.com/@user/video/123456`

## Project Structure

```
src/
  api/           # API client functions
  components/    # Reusable UI components
  hooks/         # Custom React hooks
  navigation/    # Navigation setup and types
  screens/       # Screen components
  state/         # Zustand stores
  theme/         # Design tokens (colors, typography, spacing)
  utils/         # Utility functions
```

## API Integration

The app uses React Query for all API calls. API functions are in `src/api/client.ts`:

- `createImport({ userId, url })` - Create new import job
- `getImport(importId)` - Fetch import job status
- `submitRecipeText(importId, text)` - Submit manual recipe text
- `extractRecipe(importId)` - Trigger recipe extraction
- `adaptRecipe(importId, constraints)` - Adapt recipe with constraints
- `getGroceryList(importId)` - Get grocery list for recipe

All functions are typed with TypeScript and match backend Pydantic models.

## State Management

- **Onboarding state**: Stored in Zustand with AsyncStorage persistence
- **Server state**: Managed by React Query
- **Anonymous user ID**: Stored in SecureStore (key: `anon_user_id`)

## Design System

- **Spacing**: 8px grid system
- **Colors**: Primary orange (#FF9F1C), text colors, backgrounds
- **Typography**: Title (28px), Section (20px), Body (16px), Secondary (14px), Caption (12px)
- **Components**: Buttons (52px height), inputs (14px border radius), chips

## Environment Variables

Required:
- `EXPO_PUBLIC_API_BASE_URL` - Backend API base URL

Optional (for analytics):
- PostHog key (stubbed if not provided)
- Sentry DSN (stubbed if not provided)

## Troubleshooting

### Android Share Intent Not Working
- Ensure `app.json` has the correct `intentFilters` configuration
- Rebuild the app after changing `app.json`
- Check that the app package name matches in `app.json`

### Deep Links Not Working
- Verify the scheme matches in `app.json` (`recipeimport`)
- For Android, ensure intent filters are properly configured
- For iOS, ensure URL scheme is registered in Info.plist (configured in `app.json` under `ios.infoPlist.CFBundleURLTypes`)
- Rebuild the app after changing `app.json` configuration

### API Connection Issues
- Check `EXPO_PUBLIC_API_BASE_URL` is set correctly
- Android emulator: Use `10.0.2.2` instead of `localhost`
- iOS simulator: Use `localhost`
- Ensure backend is running and CORS is configured

### iOS Simulator Issues

#### "Can't determine id of Simulator app" Error
If Expo CLI can't find the Simulator app:

1. **Manual method (recommended)**:
   ```bash
   # Start Expo
   npm start
   
   # In another terminal, open Simulator manually
   open -a Simulator
   
   # Wait for Simulator to boot, then:
   # 1. Tap the Expo Go app icon in the simulator
   # 2. Enter the URL shown in Expo terminal (e.g., exp://127.0.0.1:8082)
   #    OR scan the QR code with your phone's camera
   ```

2. **Alternative: Use xcrun directly**:
   ```bash
   # Boot simulator device
   xcrun simctl boot "iPhone 16 Pro"  # or your device name
   
   # Open Expo URL in simulator
   xcrun simctl openurl booted "exp://127.0.0.1:8082"
   ```

3. **Fix xcode-select path** (if needed):
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```

#### "Operation timed out" Error
If you see timeout errors when opening URLs:

1. **Wait for simulator to fully boot**: Make sure the Simulator app is open and the device home screen is visible
2. **Use localhost instead of IP**: The URL should be `exp://127.0.0.1:8082` or `exp://localhost:8082`
3. **Manually open Expo Go**: Open the Expo Go app in the simulator and enter the URL manually

## Development Notes

- All screens include loading and error states
- API calls are mocked/stubbed if backend is unavailable
- Onboarding state persists across app restarts
- Anonymous user ID is generated on first launch and persisted
