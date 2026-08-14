# Pong Ladder

Pong Ladder is a table tennis ladder tournament app. Players join fixed quarterly seasons, challenge nearby players above or below them, register best-of-five match results, and move through player and team ranking ladders.

## Tech Stack

- Next.js App Router
- React and TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- Vitest
- Docker and Docker Compose

## Delivery flow

`dev` is the integration branch and `main` is production-ready. Create feature
branches from `dev`, open pull requests into `dev`, verify the integrated
result, then promote `dev` to `main` through a pull request. Direct pushes to
`main` are avoided.

GitHub Actions runs linting, type checking, tests, Prisma validation/client
generation, the production build, and a Docker build for `dev` pushes and pull
requests targeting `dev` or `main`. A merge to `main` publishes a multi-platform
GHCR image; Flux promotes its immutable digest to Talos.

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

## Homelab Kubernetes Deployment

This deployment targets the Talos homelab cluster with separate internal and public Traefik ingress classes, cert-manager, the internal `step-ca` issuer, and the public `letsencrypt-prod` issuer. PostgreSQL runs inside Kubernetes as a separate StatefulSet with persistent storage.

Application details detected from this repository:

- Framework/runtime: Next.js App Router on Node.js.
- Package manager: npm with `package-lock.json`.
- Build command: `npm run build`.
- Start command: `npm start`, which runs `next start -H 0.0.0.0`.
- Container port: `3000`.
- Database: PostgreSQL via Prisma.
- Migration command: `npx prisma migrate deploy`.
- Required runtime secrets: `SESSION_SECRET` and `BETTER_AUTH_SECRET`, each at least 32 characters. `SESSION_SECRET` remains a temporary fallback during rollout.
- Required production origin: `APP_BASE_URL`, including the HTTPS scheme and public host.
- Email verification delivery: SMTP in production; console delivery is available for local development.
- HTTPS runtime settings: `SESSION_COOKIE_SECURE=true` and `APP_ENABLE_HTTPS_HEADERS=true`.

The Kubernetes manifests live in `deploy/kubernetes/` and create:

- Namespace: `pingpong`
- PostgreSQL StatefulSet: `postgres`
- PostgreSQL Service: `postgres`
- PostgreSQL PVC: `postgres-data-postgres-0`
- App Deployment: `pong-ladder`
- App Service: `pong-ladder`
- Migration Job: `pong-ladder-migrate`
- Internal certificate and TLS secret: `pong-ladder-home-arpa`, `pong-ladder-home-arpa-tls`
- Internal ingress and hostname: `pong-ladder`, `pong-ladder.home.arpa`
- Public certificate and TLS secret: `pongladder-com`, `pongladder-com-tls`
- Public ingress and hostnames: `pong-ladder-public`, `pongladder.com`, `www.pongladder.com`
- cert-manager issuers: `step-ca` and `letsencrypt-prod` `ClusterIssuer` resources
- Ingress classes: `traefik` and `traefik-public`
- Canonical application origin: `https://pongladder.com`

The app image is:

```text
ghcr.io/victorpero/pong-ladder:0.1.1
```

The in-cluster PostgreSQL DNS name is:

```text
postgres.pingpong.svc.cluster.local
```

The app `DATABASE_URL` should use this format:

```text
postgresql://pong:<STRONG_RANDOM_PASSWORD>@postgres.pingpong.svc.cluster.local:5432/pong_ladder?schema=public
```

The manifests assume internal DNS is covered by the existing wildcard and public DNS points to the public Traefik load balancer:

```text
*.home.arpa -> 192.168.20.230
pongladder.com -> public Traefik
www.pongladder.com -> public Traefik
```

### Prerequisites

- Docker with Buildx enabled.
- A GitHub token that can publish to GHCR.
- `kubectl` configured for the Talos cluster.
- `local-path-provisioner` installed as the default StorageClass.
- Existing `traefik` and `traefik-public` ingress classes, cert-manager, `step-ca` and `letsencrypt-prod` ClusterIssuers, and the required internal and public DNS records.

Set the kubeconfig for this homelab:

```bash
export KUBECONFIG=~/talos-homelab-vlan20/kubeconfig
```

Confirm the cluster is reachable:

```bash
kubectl get nodes -o wide
kubectl get storageclass
```

### Build And Push

Log in to GHCR without putting the token in shell history:

```bash
printf "GitHub PAT: "
stty -echo
read GITHUB_PAT
stty echo
printf "\n"
printf '%s' "$GITHUB_PAT" | docker login ghcr.io -u victorpero --password-stdin
unset GITHUB_PAT
```

Build and push the linux/amd64 image with both tags:

```bash
docker buildx build \
  --platform linux/amd64 \
  --build-arg APP_ENABLE_HTTPS_HEADERS=true \
  -t ghcr.io/victorpero/pong-ladder:0.1.1 \
  -t ghcr.io/victorpero/pong-ladder:latest \
  --push \
  .
```

### Deploy Order

Create the namespace:

```bash
kubectl apply -f deploy/kubernetes/namespace.yaml
```

Create the PostgreSQL secret. Save the generated password in the current shell so the app secret uses the same value:

```bash
DB_PASSWORD="$(openssl rand -hex 24)"

kubectl -n pingpong create secret generic pong-ladder-postgres \
  --from-literal=POSTGRES_DB='pong_ladder' \
  --from-literal=POSTGRES_USER='pong' \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD"
```

Apply PostgreSQL and wait for it:

```bash
kubectl apply -f deploy/kubernetes/postgres.yaml
kubectl rollout status statefulset/postgres -n pingpong
kubectl get pvc -n pingpong
```

Create the app runtime secret:

```bash
SESSION_SECRET="$(openssl rand -base64 48)"

kubectl -n pingpong create secret generic pong-ladder-secrets \
  --from-literal=DATABASE_URL="postgresql://pong:${DB_PASSWORD}@postgres.pingpong.svc.cluster.local:5432/pong_ladder?schema=public" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET"
```

Do not commit raw Secret YAML, database passwords, GitHub tokens, kubeconfig, talosconfig, or CA private keys. `deploy/kubernetes/postgres-secret.example.yaml` is only a placeholder example and is not included in `kustomization.yaml`.

If the GHCR image is public, no image pull secret is required. If the image is private, create this pull secret:

```bash
printf "GitHub PAT: "
stty -echo
read GITHUB_PAT
stty echo
printf "\n"
EMAIL="you@example.com"

kubectl -n pingpong create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=victorpero \
  --docker-password="$GITHUB_PAT" \
  --docker-email="$EMAIL"

unset GITHUB_PAT
```

Then add `imagePullSecrets` to `deploy/kubernetes/deployment.yaml` under `spec.template.spec`:

```yaml
imagePullSecrets:
  - name: ghcr-pull-secret
```

Deploy the app, certificates, middleware, and ingresses after both secrets exist:

```bash
kubectl apply -k deploy/kubernetes
```

The app container runs `npx prisma migrate deploy` before starting Next.js. To run migrations manually as a temporary Kubernetes Job, apply the migration manifest after `pong-ladder-secrets` exists:

```bash
kubectl apply -f deploy/kubernetes/migration-job.yaml
kubectl wait --for=condition=complete job/pong-ladder-migrate -n pingpong --timeout=120s
kubectl logs -n pingpong job/pong-ladder-migrate
kubectl delete job pong-ladder-migrate -n pingpong
```

`deploy/kubernetes/migration-job.yaml` is not included in `kustomization.yaml`, so it only runs when you apply it directly.

Migrations do not create an admin user. To promote an existing user without seeding demo data, run a one-off Prisma update from the app pod:

```bash
ADMIN_IDENTIFIER='victorpero'
POD="$(kubectl get pod -n pingpong -l app.kubernetes.io/name=pong-ladder -o jsonpath='{.items[0].metadata.name}')"

kubectl exec -n pingpong "$POD" -c pong-ladder -- env ADMIN_IDENTIFIER="$ADMIN_IDENTIFIER" node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const identifier = process.env.ADMIN_IDENTIFIER;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { email: identifier.toLowerCase() }]
    },
    select: { id: true, username: true, email: true }
  });

  if (!user) {
    throw new Error(`No user found for ${identifier}.`);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
    select: { username: true, email: true, isAdmin: true }
  });

  console.log(JSON.stringify(updated, null, 2));
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
'
```

The user may need to log out and back in before the admin UI appears.

### Verify

Check Kubernetes objects and logs:

```bash
kubectl get pods -n pingpong
kubectl get pvc -n pingpong
kubectl get svc -n pingpong
kubectl logs -n pingpong statefulset/postgres
kubectl logs -n pingpong deploy/pong-ladder
kubectl get ingress -n pingpong
kubectl get certificate -n pingpong
kubectl describe certificate -n pingpong pong-ladder-home-arpa
```

Check DNS:

```bash
dig pong-ladder.home.arpa +short
```

Expected:

```text
192.168.20.230
```

Test HTTPS:

```bash
curl -I https://pong-ladder.home.arpa
curl -I https://pongladder.com
curl -I https://www.pongladder.com
```

Expected results:

- Postgres pod is `Running`.
- Postgres PVC is `Bound`.
- Pong Ladder pod is `Running`.
- Pong Ladder can connect to Postgres.
- Both certificates are `Ready=True`.
- Internal DNS resolves to `192.168.20.230` and public DNS resolves to the public Traefik endpoint.
- `https://pong-ladder.home.arpa` and `https://pongladder.com` load in a browser.
- `https://www.pongladder.com` redirects to `https://pongladder.com`.

### Troubleshooting

- `ImagePullBackOff`: check the image name, image tag, whether the GHCR image is private, whether `ghcr-pull-secret` exists, and whether the GitHub PAT has package read permission.
- Pong Ladder crashes with database connection errors: check `DATABASE_URL`, the `postgres` Service name, Postgres pod logs, secret values, and whether migrations have run.
- Postgres pod is `Pending`: check `kubectl get pvc -n pingpong`, the default StorageClass, and `local-path-provisioner`.
- Data disappears: Postgres data must be persisted by the PVC. Do not delete `postgres-data-postgres-0` unless intentionally wiping the database.
- `localhost` in `DATABASE_URL`: inside the app pod, `localhost` means the app pod itself, not the Postgres pod. Use `postgres.pingpong.svc.cluster.local`, or simply `postgres` inside the same namespace.
- Certificate stuck pending: check cert-manager events, the relevant `step-ca` or `letsencrypt-prod` ClusterIssuer, DNS resolution, and the selected Traefik ingress class.
- Traefik returns 404: check the Ingress host, service name, service port, and whether DNS points to the Traefik LoadBalancer.
- Connection refused: check whether the app is listening on port `3000` and whether the Service `targetPort` matches the container port.

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

Do not run the seed script against a production or homelab database you want to keep. It deletes existing matches, challenges, seasons, users, and teams before inserting demo data.

## Tests

Run unit tests:

```bash
npm test
```

The scoring rules live in `src/lib/scoring.ts` and are covered by `tests/scoring.test.ts`.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `NEXT_PUBLIC_APP_NAME`: Public app name for client-visible configuration.
- `APP_BASE_URL`: Trusted public origin used for authentication callbacks and verification links. Production values must use HTTPS.
- `BETTER_AUTH_SECRET`: Random server-only secret, at least 32 characters, used for authentication state and session cookies. `SESSION_SECRET` is accepted as a rollout fallback.
- `SESSION_SECRET`: Legacy server-only secret retained during the session migration.
- `ORGANIZATION_ACCESS_CODE_SECRET`: Server-only secret used to hash organization codes for lookup and validation.
- `ORGANIZATION_CREDENTIAL_SECRET`: Server-only secret used to encrypt recoverable organization sharing codes. When omitted, a domain-separated key is derived from the access-code or authentication secret for rollout compatibility.
- `SESSION_COOKIE_SECURE`: Set to `false` for plain HTTP LAN access. Set to `true` when serving the app over HTTPS.
- `APP_ENABLE_HTTPS_HEADERS`: Set to `false` for plain HTTP LAN access. Set to `true` when serving the app over HTTPS.
- `EMAIL_DELIVERY_MODE`: `console` for local development or `smtp` for real delivery. Production defaults to `smtp`.
- `EMAIL_FROM`: Sender address used for verification messages.
- `RESEND_API_KEY`: Server-only Resend credential used as the password when `SMTP_HOST` is `smtp.resend.com`. Leave the example value empty and configure the real key only in a secret-bearing environment file or secret store.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`: SMTP transport configuration. `SMTP_PASSWORD` remains available for non-Resend providers or as an explicit credential override.
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`: Optional Google OpenID Connect credentials. Configure the authorized redirect URI as `${APP_BASE_URL}/api/auth/callback/google`.
- `APP_PORT`: Host port published by Docker Compose for the Next.js app.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`: PostgreSQL container settings.
- `SEED_ADMIN_PASSWORD`: Optional password for the seeded admin account. Defaults to `SEED_USER_PASSWORD`.
- `SEED_USER_PASSWORD`: Optional password for seeded non-admin users. Defaults to `password123`.
- `ORGANIZATION_CREATION_ENABLED`: Set to `true` to enable organization creation for every verified account.
- `ORGANIZATION_CREATOR_EMAILS`: Comma-separated verified-email allowlist used while global organization creation is disabled.

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

- Sessions are server-side database records referenced by secure HTTP-only cookies. Deploying the identity migration invalidates the former stateless session cookie, so users sign in again once after rollout.
- Existing password hashes are migrated into credential-provider accounts. Existing users start unverified and must verify their current email before organization access is restored.
- Google identities are never linked by matching email alone. Existing users must sign in first and explicitly link Google from their account page.
- Email verification tokens are random, stored only as SHA-256 hashes, expire after 30 minutes, and are single use. Do not commit real secrets.
- Match registration requires an accepted challenge and is limited to admins or match participants.
- A second decline for the same challenger/challenged pair records a 3-0 forfeit win for the challenger.
