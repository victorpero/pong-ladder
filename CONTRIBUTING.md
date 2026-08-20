# Contributing to Pong Ladder

Thank you for helping improve Pong Ladder. This guide covers the application-development workflow; production operations are maintained separately from ordinary contributions.

## Prerequisites

- Git
- Node.js 20 (the version in `.nvmrc`)
- npm
- Docker with Docker Compose, for the local PostgreSQL service

## Development setup

1. Fork and clone the repository, then start from the integration branch:

   ```bash
   git switch dev
   git pull --ff-only origin dev
   git switch -c feature/short-description
   ```

2. Install the exact dependency versions from the lockfile:

   ```bash
   npm ci
   ```

3. Create a local environment file:

   ```bash
   cp config/env.example .env
   ```

   Replace the example secrets with local-only values. Never commit `.env` or real credentials.

4. Start PostgreSQL:

   ```bash
   docker compose up -d db
   ```

5. Apply the development migrations:

   ```bash
   npm run prisma:migrate
   ```

6. Optionally load demo data:

   ```bash
   npm run prisma:seed
   ```

   The seed script deletes existing application data before inserting its fixtures. Run it only against a disposable development database.

7. Start the application:

   ```bash
   npm run dev
   ```

   The development server is available at `http://localhost:3000`.

## Checks

Run the relevant checks before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npx prisma validate
npm run build
```

CI runs these checks and also builds the production container image. If your change affects the container or startup behavior, also run:

```bash
docker build --build-arg APP_ENABLE_HTTPS_HEADERS=true --tag pong-ladder:local .
```

## Transactional emails

Email content is rendered independently of the delivery transport. The shared layout lives in `src/lib/email-template.ts`, and each message has its own module: `src/lib/verification-email-template.ts`, `src/lib/password-reset-email-template.ts`, and `src/lib/challenge-notification-email-template.ts`. Preview every message locally with deterministic example data:

```bash
npm run email:preview
```

The command writes the HTML and plain-text versions to a temporary directory and prints their paths. Never render or share a real recipient address, verification token, or password reset token.

Delivery configuration, the Resend free-tier limits the project runs against, and the challenge-notification flow are documented in [docs/email-delivery.md](docs/email-delivery.md).

## Languages and translations

Every page is served under a language segment, such as `/sv/org/polisen/ladder`. `src/app/[locale]/layout.tsx` resolves the language, sets the `lang` attribute, and hands the dictionary to client components through `LocaleProvider`.

Interface text lives in `src/lib/i18n/dictionaries/en.ts` and `src/lib/i18n/dictionaries/sv.ts`. English defines the `Dictionary` type, so a key that is missing or misspelled in Swedish fails `npm run typecheck`, and `tests/locale-dictionaries.test.ts` fails when the two files drift apart or a placeholder changes.

When you add interface text:

- add the key to both dictionaries and read it through `getDictionary(locale)` on the server or `useDictionary()` in a client component;
- interpolate names with `t(template, values)` and counts with `plural(count, forms)` instead of building sentences from fragments;
- leave organization names, Pong Ladder, usernames, and other user-provided values untranslated, and translate only the sentence around them;
- build links with the helpers in `src/lib/organization-paths.ts` so the active language stays in the address.

Server actions read the active language from the locale cookie through `getRequestDictionary()`, which middleware keeps in step with the page the reader is on.

## Database changes

Create Prisma migrations with a descriptive name and commit the generated migration alongside the schema change:

```bash
npx prisma migrate dev --name describe_the_change
```

Review generated SQL before committing it. Include rollout, backfill, and compatibility notes in the pull request when a migration changes existing data or constraints.

## Pull requests

- Keep each pull request focused on one issue or outcome.
- Add or update tests for behavior changes.
- Update contributor or product documentation when commands, workflows, or user-visible behavior change.
- Complete every section of the pull-request template; use `N/A` where a section does not apply.
- Include screenshots for user-interface changes.
- Never commit secrets, personal infrastructure identifiers, production data, or generated build output.

## Branch and release flow

`dev` is the integration branch and `main` is production-ready.

1. Create a feature or fix branch from `dev`.
2. Open a pull request into `dev` and wait for the required checks.
3. Verify the integrated result on `dev`.
4. Promote `dev` to `main` through a pull request.
5. Merge only after all required checks pass; do not push directly to `main`.

Merges to `main` publish the GitHub Release and then the production container image. Contributors do not need access to the production environment to develop or test application changes.

## Releases

Every user-visible version comes from one file, `src/data/releases.json`. It feeds the version in the application footer, the in-app **What's new** page, the published GitHub Release, and the `version` field in `package.json`. Notes are written in every supported language, like the interface dictionaries.

When a change is worth telling players about, add or extend the top entry in that file and run:

```bash
npm run release:sync
```

Promoting `dev` to `main` is the release. The release workflow tags the promoted commit, publishes the matching GitHub Release, and only then builds and pushes the production container image, so a deployed version always has a tag and a release behind it. There is no manual tagging step, and merges into `dev` never publish either.

Every promotion to `main` must therefore add a release entry. Promoting a version that was already released at another commit fails the workflow instead of deploying code the published tag does not describe.

The full process, the rules the release data must satisfy, and how to write player-facing notes are documented in [docs/releases.md](docs/releases.md).

## Deployment configuration

Environment-specific production deployment configuration is maintained separately from this application repository. Pong Ladder does not currently provide a supported generic Kubernetes or self-hosting manifest set.

The ownership rationale is recorded in [docs/readme-strategy.md](docs/readme-strategy.md#deployment-ownership).
