# Pong Ladder

Pong Ladder is a table tennis ladder tournament app. Players join fixed quarterly seasons, challenge nearby players above them, register best-of-five match results, and move through player and team ranking ladders.

## Tech Stack

- Next.js App Router
- React and TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Vitest
- Docker and Docker Compose

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp config/env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up db
```

4. Run migrations and seed data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Start the app:

```bash
npm run dev
```

Open http://localhost:3000.

## Docker Compose on docker01

Copy the example environment file and replace the placeholder secrets before starting the containers:

```bash
cp .env.example .env
```

If you change `POSTGRES_PASSWORD` after a database volume already exists, update the database user's password or recreate the volume; Postgres only uses `POSTGRES_PASSWORD` when initializing a new data directory.

Build and start the app and PostgreSQL:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop the containers:

```bash
docker compose down
```

Open the app from another computer on your LAN:

```text
http://192.168.1.106:3000
```

The app container publishes `${APP_PORT:-3000}` on the VM host and listens on `0.0.0.0` inside Docker. PostgreSQL is available to the app on the Compose network as `db`; the app connects with `DATABASE_URL` set to `postgresql://...@db:5432/...`. For local development, PostgreSQL is also published on `127.0.0.1:${POSTGRES_PORT:-5432}` only.

To change the LAN port, set `APP_PORT` in `.env`, for example:

```dotenv
APP_PORT=8080
```

Then restart with:

```bash
docker compose up -d --build
```

and open:

```text
http://192.168.1.106:8080
```

On first start, the app runs `prisma migrate deploy` before launching. To load sample data after the containers are running:

```bash
docker compose exec app npm run prisma:seed
```

## Prisma

Generate the Prisma client:

```bash
npm run prisma:generate
```

Create and apply a migration during development:

```bash
npm run prisma:migrate
```

Seed the database:

```bash
npm run prisma:seed
```

The seed creates three fixed four-month seasons for the current year, 8 players, teams, completed matches, and pending/completed challenge history.

## Tests

Run unit tests:

```bash
npm test
```

The scoring rules live in `src/lib/scoring.ts` and are covered by `tests/scoring.test.ts`.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `NEXT_PUBLIC_APP_NAME`: Public app name for client-visible configuration.
- `SESSION_SECRET`: Random server-only secret, at least 32 characters, used to sign HTTP-only session cookies.
- `SESSION_COOKIE_SECURE`: Set to `false` for plain HTTP LAN access. Set to `true` when serving the app over HTTPS.
- `APP_ENABLE_HTTPS_HEADERS`: Set to `false` for plain HTTP LAN access. Set to `true` when serving the app over HTTPS.
- `APP_PORT`: Host port published by Docker Compose for the Next.js app.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`: PostgreSQL container settings.
- `SEED_ADMIN_PASSWORD`: Optional password for the seeded admin account. Defaults to `SEED_USER_PASSWORD`.
- `SEED_USER_PASSWORD`: Optional password for seeded non-admin users. Defaults to `password123`.

## Project Structure

```text
config/              Environment and test runner templates/config
Dockerfile           Production container build
compose.yml          Docker Compose app and database setup
prisma/              Prisma schema, migrations, and seed data
src/app/             App Router pages, loading, and error UI
src/components/      Reusable UI components
src/lib/             Prisma client, queries, server actions, scoring, ranking helpers
src/middleware.ts    Route protection middleware
tests/               Vitest unit tests
```

## Assumptions

- Session tokens are signed with `SESSION_SECRET` and stored in HTTP-only cookies. Do not commit real secrets.
- Match registration requires an accepted challenge and is limited to admins or match participants.
- A second decline for the same challenger/challenged pair records a 3-0 forfeit win for the challenger.
