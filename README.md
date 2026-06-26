# Pong Ladder

Pong Ladder is a mobile-first table tennis ladder tournament app. Players join yearly seasons, challenge nearby players above them, register best-of-five match results, and move through a points-based ranking ladder.

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
cp .env.example .env
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

## Docker Compose

Run the app and database together:

```bash
docker compose up --build
```

The app reads `DATABASE_URL` from the Compose environment and connects to the `db` service.

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

The seed creates one active season for the current year, 8 players, completed matches, and pending/completed challenge history.

## Tests

Run unit tests:

```bash
npm test
```

The scoring rules live in `lib/scoring.ts` and are covered by `tests/scoring.test.ts`.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `NEXT_PUBLIC_APP_NAME`: Public app name for client-visible configuration.

## Project Structure

```text
app/                 App Router pages, loading, and error UI
components/          Reusable UI components
lib/                 Prisma client, queries, server actions, scoring, ranking helpers
prisma/              Prisma schema, migrations, and seed data
tests/               Vitest unit tests
Dockerfile           Production-friendly container image
docker-compose.yml   Local Next.js and PostgreSQL development stack
```

## Assumptions

- Authentication is intentionally simple for the MVP: users have hashed passwords in the database, but login/session management is left structured for a later hardening pass.
- Match registration is trusted server-side form submission for now. The server validates player IDs, season participation, and valid best-of-five results.
- A second decline for the same challenger/challenged pair records a 3-0 forfeit win for the challenger.

