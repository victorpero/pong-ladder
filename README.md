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

This deployment targets the Talos homelab cluster behind Traefik, MetalLB, Technitium DNS, cert-manager, and the `step-ca` ClusterIssuer. PostgreSQL runs inside Kubernetes as a separate StatefulSet with persistent storage.

Application details detected from this repository:

- Framework/runtime: Next.js App Router on Node.js.
- Package manager: npm with `package-lock.json`.
- Build command: `npm run build`.
- Start command: `npm start`, which runs `next start -H 0.0.0.0`.
- Container port: `3000`.
- Database: PostgreSQL via Prisma.
- Migration command: `npx prisma migrate deploy`.
- Required runtime secret: `SESSION_SECRET`, at least 32 characters.
- HTTPS runtime settings: `SESSION_COOKIE_SECURE=true` and `APP_ENABLE_HTTPS_HEADERS=true`.

The Kubernetes manifests live in `deploy/kubernetes/` and create:

- Namespace: `pingpong`
- PostgreSQL StatefulSet: `postgres`
- PostgreSQL Service: `postgres`
- PostgreSQL PVC: `postgres-data-postgres-0`
- App Deployment: `pong-ladder`
- App Service: `pong-ladder`
- Migration Job: `pong-ladder-migrate`
- Certificate: `pong-ladder-home-arpa`
- TLS secret: `pong-ladder-home-arpa-tls`
- Ingress: `pong-ladder`
- Hostname: `pong-ladder.home.arpa`
- cert-manager issuer: `step-ca` `ClusterIssuer`
- Ingress class: `traefik`

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

The manifests assume DNS is already covered by the existing wildcard:

```text
*.home.arpa -> 192.168.20.230
```

### Prerequisites

- Docker with Buildx enabled.
- A GitHub token that can publish to GHCR.
- `kubectl` configured for the Talos cluster.
- `local-path-provisioner` installed as the default StorageClass.
- Existing Traefik, MetalLB, cert-manager, `step-ca` ClusterIssuer, and Technitium wildcard DNS.

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

Deploy the app, certificate, and ingress:

```bash
kubectl apply -f deploy/kubernetes/deployment.yaml
kubectl apply -f deploy/kubernetes/service.yaml
kubectl apply -f deploy/kubernetes/certificate.yaml
kubectl apply -f deploy/kubernetes/ingress.yaml
```

You can also apply everything after both secrets exist:

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
```

Expected results:

- Postgres pod is `Running`.
- Postgres PVC is `Bound`.
- Pong Ladder pod is `Running`.
- Pong Ladder can connect to Postgres.
- Certificate is `Ready=True`.
- DNS resolves to `192.168.20.230`.
- `https://pong-ladder.home.arpa` loads in a browser.

### Troubleshooting

- `ImagePullBackOff`: check the image name, image tag, whether the GHCR image is private, whether `ghcr-pull-secret` exists, and whether the GitHub PAT has package read permission.
- Pong Ladder crashes with database connection errors: check `DATABASE_URL`, the `postgres` Service name, Postgres pod logs, secret values, and whether migrations have run.
- Postgres pod is `Pending`: check `kubectl get pvc -n pingpong`, the default StorageClass, and `local-path-provisioner`.
- Data disappears: Postgres data must be persisted by the PVC. Do not delete `postgres-data-postgres-0` unless intentionally wiping the database.
- `localhost` in `DATABASE_URL`: inside the app pod, `localhost` means the app pod itself, not the Postgres pod. Use `postgres.pingpong.svc.cluster.local`, or simply `postgres` inside the same namespace.
- Certificate stuck pending: check cert-manager events, `step-ca` ClusterIssuer health, DNS resolution inside Kubernetes, CoreDNS forwarding for `home.arpa`, and the Traefik ingress class.
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
