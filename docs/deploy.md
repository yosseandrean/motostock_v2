# Deploying Motostock

The app ships as a single Docker container (`app` in `docker-compose.yml`) with
a Caddy reverse proxy in front of it that terminates HTTPS. The SQLite database
lives on a named volume, so it survives container restarts and image rebuilds.

## What you need

- A VPS (or any host) with Docker Engine and the Compose plugin installed.
- A hostname whose DNS `A`/`AAAA` record points at the VPS's public IP
  (e.g. `stok.example.com`). Caddy needs this to obtain the HTTPS certificate.
- Ports **80** and **443** open to the internet on the VPS.

## 1. Get the code

```bash
git clone git@github.com:yosseandrean/motostock_v2.git
cd motostock_v2
```

## 2. Configure secrets

Create a `.env` file (it is gitignored) with the three production values:

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable          | Purpose                                                     |
| ----------------- | ----------------------------------------------------------- |
| `SESSION_SECRET`  | Long random string used to sign session cookies.            |
| `SHARED_PASSWORD` | The single shared password used to log in.                  |
| `MOTOSTOCK_DOMAIN`| Public hostname of the VPS, e.g. `stok.example.com`.        |

Generate a strong `SESSION_SECRET`:

```bash
openssl rand -base64 32
```

> `DATABASE_URL` is not read from `.env` for the container: the compose file
> pins it to `file:/data/motostock.db` so the database always lands on the
> volume. The `DATABASE_URL` value in `.env` is only used by local development.

## 3. Build and start

```bash
docker compose up -d --build
```

On first boot the `app` container applies the Prisma migrations to the empty
database on the volume, then starts the Next.js server. Caddy starts once the
app passes its healthcheck, obtains the TLS certificate, and begins serving
HTTPS.

## 4. Verify

- Open `https://<MOTOSTOCK_DOMAIN>` from a phone or anywhere — you should see
  the login page (the certificate is trusted automatically).
- Log in with `SHARED_PASSWORD` and confirm the inventory page loads.

Check status and logs:

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f caddy
```

## 5. The database volume

The SQLite file is persisted on the `motostock-data` named volume, mounted at
`/data` in the `app` container. Rebuilding the image or recreating the
container does not touch it.

- **Backup** — use the in-app "Ekspor CSV" (export) feature, or copy the file
  out of the volume:

  ```bash
  docker compose cp app:/data/motostock.db ./backup.db
  ```

- **Reset** — delete the volume and recreate (this wipes all data):

  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

## 6. Updating to a new release

```bash
git pull
docker compose up -d --build
```

The entrypoint runs `prisma migrate deploy` on every start, so any new
migrations are applied automatically before the server comes up. To see what
changed before applying:

```bash
docker compose run --rm --entrypoint npx app prisma migrate status
```

## How it works

- **Image** (`Dockerfile`) — multi-stage build using Next.js
  `output: "standalone"`. The runner stage copies the traced server, static
  assets, the Prisma CLI + schema + migrations, and the full dependency tree
  (so `prisma migrate deploy` and the query engine are always present).
- **Entrypoint** (`docker/entrypoint.sh`) — runs `prisma migrate deploy`, then
  `node server.js`.
- **HTTPS** (`Caddyfile`) — Caddy proxies `app:3000` and obtains/renews the
  Let's Encrypt certificate automatically. No manual cert handling.
- **Auth** — the app sets its session cookie with `Secure` in production, so
  sessions only travel over HTTPS (see `app/api/login/route.ts`).
