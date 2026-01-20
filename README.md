# Recipe Import MVP

Share a TikTok → import recipe → adapt recipe → grocery list.

## Structure
- `apps/api`: FastAPI backend (Postgres, Redis/RQ)
- `apps/mobile`: Expo React Native app (Android focused)
- `packages/shared`: Shared TypeScript types aligned with backend schemas
- `infra/docker-compose.yml`: Local stack (api, postgres, redis)

## Quickstart
1) Start backend stack:
```bash
cd infra
docker compose up --build
```
API available at http://localhost:8000 (health at `/health`).

2) Mobile app:
```bash
cd apps/mobile
npm install
npx expo start --android
```
Set `API_BASE` via Expo extra (`app.config` or env) if not default `http://localhost:8000`.

3) Flow:
- Paste or deep-link a TikTok URL on Home → creates ImportJob (idempotent 24h).
- Paste recipe text → Extract → Adapt (diet/time/servings/allergies) → Grocery list (shareable).

## Tests
```bash
cd apps/api
pytest
```

## Known limitations / TODO
- iOS share extension not implemented (documented only).
- LLM and TikTok providers are stubbed; wire real keys to call live APIs.
- Minimal styling; production hardening (auth, rate limits, analytics, Sentry) pending.
