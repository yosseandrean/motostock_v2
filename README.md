# Motostock

Tracks the secondhand motorcycle inventory and sales of a dealership: which
units are in stock, what each cost, and what sold units earned.

Built with Next.js (App Router), TypeScript, Prisma, SQLite and Recharts, for
deployment as a single container on a VPS (see `docs/adr/0002-nextjs-sqlite-single-vps.md`).

## Requirements

- Node.js 22+
- npm

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL` — SQLite file path (default `file:./dev.db`, resolved under `prisma/`).
- `SESSION_SECRET` — secret used to sign the 30-day session cookie. Use a long
  random string in production.
- `SHARED_PASSWORD` — the single shared password used to log in.

Create the database and Unit table:

```bash
npm run db:migrate
```

## Development

```bash
npm run dev
```

Open http://localhost:3000. Every route is protected: unauthenticated visitors
are redirected to the login page. Log in with the configured shared password to
reach the inventory page.

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # Vitest unit/integration tests
```

## Production

```bash
npm run build
npm start
```

## Deployment (Docker + HTTPS)

The app is packaged as a single Docker container with a Caddy reverse proxy
for automatic HTTPS, and the SQLite database persisted on a volume. See
[`docs/deploy.md`](docs/deploy.md) for the full single-VPS setup.

```bash
cp .env.example .env   # set SESSION_SECRET, SHARED_PASSWORD, MOTOSTOCK_DOMAIN
docker compose up -d --build
```

## Auth model

- Single shared password (no per-user accounts).
- Login sets an `HttpOnly`, `SameSite=Lax`, signed session cookie valid for 30
  days; logout clears it.
- `proxy.ts` protects every page route and redirects unauthenticated visitors
  to `/login`.
