# Authentication Setup Complete ✅

A complete authentication system has been implemented for the Recipe Import app. Here's what was added:

## Backend Changes

### 1. User Model & Database
- ✅ Created `User` model with email, username, password (hashed)
- ✅ Added database migration (`0002_add_users_table.py`)
- ✅ Users table with indexes on email and username

### 2. Authentication System
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Auth endpoints:
  - `POST /auth/register` - Register new user
  - `POST /auth/login` - Login and get token
  - `GET /auth/me` - Get current user info

### 3. Protected Endpoints
All recipe endpoints now require authentication:
- ✅ `GET /recipes` - Lists recipes for authenticated user
- ✅ `POST /imports` - Creates import for authenticated user
- ✅ All other endpoints verify ownership

### 4. Sample User
- ✅ Seed script creates demo user with sample recipes
- ✅ Username: `demo`
- ✅ Password: `demo123`
- ✅ Email: `demo@cooked.app`
- ✅ Includes 3 sample recipes with parsed data

## Mobile App Changes

### 1. Authentication Store
- ✅ Zustand store for auth state (`authStore.ts`)
- ✅ Persists token and user info with AsyncStorage
- ✅ Provides `isAuthenticated` flag

### 2. API Client Updates
- ✅ All requests include `Authorization: Bearer <token>` header
- ✅ Automatic token refresh handling
- ✅ Logout on 401 Unauthorized

### 3. Login Screen
- ✅ Full login/register UI
- ✅ Form validation
- ✅ Error handling
- ✅ Demo account info displayed

### 4. Navigation Updates
- ✅ AppNavigator checks auth state
- ✅ Shows Login screen if not authenticated
- ✅ Redirects to main app after login

## Setup Instructions

### Step 1: Install Backend Dependencies

```bash
cd apps/api
pip install -r requirements.txt
```

New dependencies added:
- `passlib[bcrypt]` - Password hashing
- `python-jose[cryptography]` - JWT tokens
- `python-multipart` - Form data handling

### Step 2: Run Database Migration

```bash
cd apps/api
alembic upgrade head
```

This creates the `users` table.

### Step 3: Seed Sample User

```bash
cd apps/api
python scripts/seed_sample_user.py
```

This creates:
- Demo user (username: `demo`, password: `demo123`)
- 3 sample recipes with parsed data

### Step 4: Test Authentication

```bash
# Login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'

# Use token to get recipes
TOKEN="your_token_here"
curl -X GET "http://localhost:8000/recipes" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: Run Mobile App

```bash
cd apps/mobile
npm install  # If needed
npx expo start
```

The app will:
1. Show Login screen if not authenticated
2. Allow login with demo credentials
3. Show recipes after successful login

## Demo Account

- **Username**: `demo`
- **Password**: `demo123`
- **Email**: `demo@cooked.app`

This account already has 3 sample recipes that will appear in the recipe list after login.

## API Changes Summary

### Before (Anonymous)
- `POST /imports` required `user_id` in body
- `GET /recipes?user_id=...` required user_id query param
- No authentication required

### After (Authenticated)
- `POST /imports` uses authenticated user's ID (no user_id in body)
- `GET /recipes` uses authenticated user's ID (no query param)
- All endpoints require `Authorization: Bearer <token>` header

## Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire after 30 days
- Users can only access their own recipes
- In production, set a strong `SECRET_KEY` environment variable

## Next Steps

1. **Test the flow**: Login with demo account and verify recipes appear
2. **Create your own account**: Use the register form in the app
3. **Import recipes**: Recipes will be saved to your authenticated account
4. **Production**: Set up proper secret keys and HTTPS

## Troubleshooting

### "Authentication required" error
- Make sure you're logged in
- Check that token is being sent in requests
- Token may have expired (30 days)

### Recipes not showing
- Verify you're logged in
- Check that recipes have `parsed_recipe` set
- Run seed script to create sample recipes

### Migration fails
- Ensure database is running: `docker compose ps`
- Check database connection in `alembic.ini`
- Try: `alembic upgrade head --sql` to see SQL
