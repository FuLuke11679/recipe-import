# Authentication Setup Guide

This guide explains how to set up authentication for the Recipe Import API.

## Quick Start

### 1. Run Database Migration

First, create the users table:

```bash
cd apps/api
alembic upgrade head
```

### 2. Seed Sample User

Create a demo user with sample recipes:

```bash
cd apps/api
python scripts/seed_sample_user.py
```

This creates:
- **Username**: `demo`
- **Password**: `demo123`
- **Email**: `demo@cooked.app`
- **3 sample recipes** with parsed data

### 3. Test Authentication

```bash
# Register a new user
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123"
  }'

# Login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demo",
    "password": "demo123"
  }'

# Use the token to access protected endpoints
TOKEN="your_access_token_here"
curl -X GET "http://localhost:8000/recipes" \
  -H "Authorization: Bearer $TOKEN"
```

## API Endpoints

### Public Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /health` - Health check

### Protected Endpoints (Require Authentication)

All endpoints below require a Bearer token in the Authorization header:

- `GET /auth/me` - Get current user info
- `GET /recipes` - List recipes for current user
- `POST /imports` - Create new import job
- `GET /imports/{id}` - Get import job details
- `POST /imports/{id}/recipe_text` - Submit recipe text
- `POST /imports/{id}/extract` - Extract recipe
- `POST /imports/{id}/adapt` - Adapt recipe
- `GET /imports/{id}/grocery_list` - Get grocery list

## Authentication Flow

1. User registers or logs in via `/auth/register` or `/auth/login`
2. API returns a JWT access token
3. Client includes token in Authorization header: `Authorization: Bearer <token>`
4. Token is valid for 30 days
5. All recipe operations are scoped to the authenticated user

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 30 days
- All recipe endpoints verify ownership (users can only access their own recipes)
- In production, set a strong `SECRET_KEY` in environment variables

## Mobile App Integration

The mobile app needs to:
1. Store the JWT token securely (using SecureStore)
2. Include token in all API requests
3. Handle token expiration (redirect to login)
4. Update API client to add `Authorization` header

See `apps/mobile/src/api/client.ts` for implementation.
