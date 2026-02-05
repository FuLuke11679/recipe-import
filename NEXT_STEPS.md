# Next Steps - Authentication Setup

## ✅ What's Done
1. Users table created in database
2. Demo user created (username: `demo`)
3. API code updated with authentication
4. Mobile app updated with login screen

## 🔧 Step 1: Rebuild API Container

The API container needs to be rebuilt to include the updated authentication code:

```bash
cd infra
docker compose build api
docker compose up -d api
```

Wait about 5 seconds for the container to start.

## 🔑 Step 2: Update Demo User Password

After rebuilding, update the demo user's password hash:

```bash
docker compose -f infra/docker-compose.yml exec api python -c "
from app.db import get_session
from app.models import User
from app.auth import get_password_hash

with get_session() as session:
    user = session.query(User).filter(User.username == 'demo').first()
    if user:
        user.hashed_password = get_password_hash('demo123')
        session.commit()
        print('✅ Password updated')
"
```

## 🧪 Step 3: Test Login

Test that authentication works:

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'
```

You should get back a JSON response with `access_token` and `token_type`.

## 📱 Step 4: Test Mobile App

1. Start the mobile app:
   ```bash
   cd apps/mobile
   npx expo start
   ```

2. You should see the **Login** screen first

3. Login with:
   - **Username**: `demo`
   - **Password**: `demo123`

4. After login, you should see the main app with recipes

## 🎯 Quick Test Commands

**Check if API is running:**
```bash
curl http://localhost:8000/health
```

**Check demo user exists:**
```bash
docker compose -f infra/docker-compose.yml exec db psql -U postgres -d recipes -c "SELECT username, email FROM users WHERE username = 'demo';"
```

**Check recipes for demo user:**
```bash
docker compose -f infra/docker-compose.yml exec db psql -U postgres -d recipes -c "SELECT COUNT(*) FROM import_jobs WHERE user_id = (SELECT id::text FROM users WHERE username = 'demo') AND parsed_recipe IS NOT NULL;"
```

## 🐛 Troubleshooting

**If login fails:**
- Make sure API container is rebuilt and running
- Check API logs: `docker compose -f infra/docker-compose.yml logs api --tail 50`
- Verify password was updated (run Step 2 again)

**If mobile app shows errors:**
- Check that backend is accessible from your device/emulator
- For Android emulator: backend should be at `http://10.0.2.2:8000` (automatic)
- For web: backend should be at `http://localhost:8000` (automatic)

**If recipes don't show:**
- Make sure you're logged in
- Check that recipes have `parsed_recipe` set (they need to be extracted)
- The demo user should have at least 1 recipe already

## 📝 Summary

**Demo Account:**
- Username: `demo`
- Password: `demo123`
- Email: `demo@cooked.app`

**API Endpoints:**
- `POST /auth/login` - Login
- `POST /auth/register` - Register new user
- `GET /auth/me` - Get current user (requires auth token)
- `GET /recipes` - List recipes (requires auth token)

All recipe endpoints now require authentication!
