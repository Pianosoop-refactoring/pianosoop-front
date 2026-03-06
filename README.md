# Pianosoop Frontend

Next.js frontend for Pianosoop.

## Local run

```bash
npm install
cp .env.example .env.local
npm run dev
```

- Frontend: `http://localhost:3000`
- API base URL is controlled by `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`).

## Production build check

```bash
npm run build
npm start
```

## Docker image build

```bash
docker build -t pianosoop-frontend:local .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=http://localhost:8080 pianosoop-frontend:local
```

## Full stack compose (frontend + backend + postgres)

```bash
docker compose -f docker-compose.fullstack.yml up -d --build
```

## Pre-cloud readiness

- Standalone Next output enabled (`next.config.mjs`)
- Frontend/Backend Dockerfile added
- Full stack local compose added
- `.env` sample added for frontend (`.env.example`)
# pianosoop-front
