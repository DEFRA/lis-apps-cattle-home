# lis-apps-cattle-home

Part of the Livestock Information Service (LIS), which lets livestock keepers, owners, agents and
delegates record and manage their animals.

The cattle home microsite shows a signed-in keeper the holdings they can access and the cattle on
each holding. It is a spoke: it has no sign-in of its own and is reached through the front-office
and back-office hubs.

Deployed on the Core Delivery Platform (CDP). See the
[CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-apps-cattle-home) for
environments, deployments, logs and metrics.

## Architecture

```text
hub (front-office or back-office) → /cattle → this app → lis-be4fe-cattle-home → lis-api-cattle
```

The hubs mount this app at `/cattle` and proxy requests to it, with the path prefix removed. The
module list is in
[lis-hubs-infra-registry](https://github.com/DEFRA/lis-hubs-infra-registry).

- Authentication: users sign in through the hub. This app verifies the hub JWT cookie
  (`livestock_hub_jwt`) with `@defra/lis-hubs-infra-access`. Each page also checks that the user has
  cattle read access, and holding and animal pages check access to that holding's CPH.
- Downstream calls: holding and cattle data comes from `lis-be4fe-cattle-home`, through `BaseClient`
  from `@defra/lis-hubs-infra-core`. Each call carries an AWS STS service token and the
  `x-api-key` header (`CATTLE_HOME_API_KEY`).
- Shared packages:
  [lis-hubs-infra-access](https://github.com/DEFRA/lis-hubs-infra-access) (spoke authentication and access decisions),
  [lis-hubs-infra-core](https://github.com/DEFRA/lis-hubs-infra-core) (logging, request context, service clients),
  [lis-hubs-infra-registry](https://github.com/DEFRA/lis-hubs-infra-registry) (module paths),
  [lis-infra-ui-services](https://github.com/DEFRA/lis-infra-ui-services) (layout, error pages, shared helpers),
  [lis-species-cattle](https://github.com/DEFRA/lis-species-cattle) (cattle content).

See [HUB-ARCHITECTURE.md](https://github.com/DEFRA/lis-dev/blob/main/HUB-ARCHITECTURE.md) for the
hub and spoke design.

### Routes

Paths are relative to the `/cattle` mount.

| Path                                            | Purpose                                     |
| ----------------------------------------------- | ------------------------------------------- |
| `/holdings/{county}/{parish}/{holding}`         | Holding details                             |
| `/holdings/{county}/{parish}/{holding}/animals` | Cattle on the holding, with search and sort |
| `/animals/{earTag}`                             | Details of one animal                       |
| `/health`                                       | Health check                                |

## Prerequisites

- Node.js 24 (see `.nvmrc`, use `nvm use`)
- Docker with Docker Compose
- A local clone of [lis-dev](https://github.com/DEFRA/lis-dev) (recommended, see [Running with lis-dev](#running-with-lis-dev-recommended))

## Setup

### Development

```bash
nvm use
npm install
cp .env.example .env
```

`.env` is loaded when running standalone, and also by a sideloaded `npm run dev` for variables that compose does not set. It sets `PORT=3221` (the lis-dev port) and the fake STS values `CDP_JWT_ISSUER` and `CDP_JWT_JWKS_URI`, for running on the host alongside lis-dev. `HUB_JWT_SECRET` has no default. The example value
matches the lis-dev hubs. Set `CATTLE_HOME_API_KEY` to the key that `lis-be4fe-cattle-home` accepts
(`local-dev-cattle-home-api-key` in lis-dev).

### Test

There are no tools to install beyond `npm install`. Tests use [Vitest](https://vitest.dev/).

## Running with lis-dev (recommended)

This app only works properly alongside the hubs, `lis-be4fe-cattle-home` and the fake identity
providers. [lis-dev](https://github.com/DEFRA/lis-dev) runs all of these locally with Docker
Compose and serves them behind local HTTPS hostnames, so it is the recommended way to run and work
on this repo. Follow its README for the one-time setup.

Start the stack:

```bash
cd lis-dev
docker compose up -d
```

In compose this app is the `lis-apps-cattle-home` service, listening on port 3221. To work on it,
swap its container for a local server with hot reload while the rest of the stack stays in Docker:

```bash
.bin/sideload up apps/cattle-home
.bin/sideload restore    # when done: back to the container
```

Then open <https://front-office.lis.defra/cattle> and sign in through the fake identity provider.
Service tokens come from the fake STS in lis-dev (`lis-fake-sts`), which the compose files point
to with `AWS_ENDPOINT_URL_STS`.

## Running standalone

You can also run the server on its own with `npm run dev`, using the values in `.env`. Pages need a
hub JWT cookie, so without the hub you are redirected to sign in. Data pages also need
`lis-be4fe-cattle-home` running on port 8087, because the client finds it by environment name
(`ENVIRONMENT`) and not by a URL setting.

| Script              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Build frontend assets, then start the server with nodemon |
| `npm run dev:debug` | As `dev`, but waits for a debugger to attach              |
| `npm start`         | Production build and start                                |

### Configuration

Configuration is in `src/config/config.js`. Values marked secret must be set as secrets in the
CDP portal for every deployed environment. Required values have no default.

The service refuses to start if `HUB_JWT_SECRET` is unset or shorter than 32 characters. In a
deployed environment (any `ENVIRONMENT` other than `local` or `docker_compose`) it also refuses
the public local development value from `.env.example` and lis-dev. Set `LOG_HASH_SECRET` in
every deployed environment too: without it the hashed log values (such as `user_email_hash`)
are dropped, with a warning each time one is set, so they can no longer be searched.

| Variable                    | Description                                                                 | Default                                                 |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `SERVICE_VERSION`           | Deployed version, for logs. CDP sets it                                     | none                                                    |
| `ENVIRONMENT`               | `local`, `docker_compose`, `dev`, `test`, `ext-test`, `perf-test` or `prod` | `local`                                                 |
| `HOST`                      | Address to bind                                                             | `0.0.0.0`                                               |
| `PORT`                      | Port to bind                                                                | `8085`                                                  |
| `STATIC_CACHE_TIMEOUT`      | Static asset cache timeout (ms)                                             | `604800000`                                             |
| `ASSET_PATH`                | Base path for static assets                                                 | `/public`                                               |
| `LOG_ENABLED`               | Whether logging is on                                                       | `true` (`false` in tests)                               |
| `LOG_LEVEL`                 | Log level                                                                   | `info`                                                  |
| `LOG_FORMAT`                | `ecs` or `pretty`                                                           | `ecs` in production, else `pretty`                      |
| `LOG_HASH_SECRET`           | Secret. Key for hashing sensitive values in logs                            | none                                                    |
| `HTTP_PROXY`                | Outbound HTTP proxy                                                         | none                                                    |
| `SESSION_CACHE_ENGINE`      | `redis` or `memory`                                                         | `redis` in production, else `memory`                    |
| `SESSION_CACHE_NAME`        | Server-side cache name                                                      | `home-cattle-session`                                   |
| `SESSION_CACHE_TTL`         | Server-side cache TTL (ms)                                                  | `14400000`                                              |
| `REDIS_HOST`                | Redis host                                                                  | `127.0.0.1`                                             |
| `REDIS_USERNAME`            | Redis username                                                              | empty                                                   |
| `REDIS_PASSWORD`            | Secret. Redis password                                                      | empty                                                   |
| `REDIS_KEY_PREFIX`          | Redis key prefix                                                            | `home-cattle:`                                          |
| `USE_SINGLE_INSTANCE_CACHE` | Single Redis instance rather than a cluster                                 | `false` in production, else `true`                      |
| `REDIS_TLS`                 | Connect to Redis over TLS                                                   | `true` in production, else `false`                      |
| `CATTLE_HOME_API_KEY`       | Secret. API key sent to `lis-be4fe-cattle-home` as `x-api-key`              | empty                                                   |
| `CATTLE_HOME_API_TIMEOUT`   | Timeout for `lis-be4fe-cattle-home` requests (ms)                           | `5000`                                                  |
| `HUB_ORIGINS`               | Hub origins allowed to use this spoke                                       | front-office and back-office hubs and their local ports |
| `HUB_JWT_COOKIE_NAME`       | Cookie that carries the hub JWT                                             | `livestock_hub_jwt`                                     |
| `HUB_JWT_SECRET`            | Secret, required, 32+ chars. Verifies hub JWTs. Must match the hubs         | none                                                    |
| `HUB_JWT_TTL_SECONDS`       | Hub JWT cookie TTL (seconds)                                                | `14400`                                                 |
| `HUB_JWT_AUDIENCE`          | Hub JWT audience                                                            | `livestock-spokes`                                      |

Service tokens need `CDP_JWT_ISSUER` and `CDP_JWT_JWKS_URI` (set by CDP, and by lis-dev for the
fake STS). On CDP the platform also sets `AWS_REGION`. In lis-dev, the compose files set
`AWS_ENDPOINT_URL_STS` to point at the fake STS.

## Running tests

```bash
npm test                 # unit tests
npm run test:coverage    # with coverage; fails below 90%
npm run lint             # ESLint and Stylelint
npm run format:check     # Prettier
```

End-to-end journeys are covered by [lis-journey-tests](https://github.com/DEFRA/lis-journey-tests).

## Monitoring

- Health check: `GET /health`
- Logs: OpenSearch dashboard per environment, linked from the [CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-apps-cattle-home) under Logs
- Metrics: Grafana dashboard per environment, linked from the [CDP portal service page](https://portal.cdp-int.defra.cloud/services/lis-apps-cattle-home) under Metrics

## Pipelines

Build, versioning and publishing run in GitHub Actions (`.github/workflows`) using Cake scripts (`*.cake`):

- **Pull request to `main`**: validate (format, lint, test), Sonar analysis, version check
- **Push to a `feature/` or `hotfix/` branch**: prerelease build and tag
- **Merge to `main`**: release tag, then publish the container image to CDP

Versions come from git tags (SemVer).

## Branching policy

The repo uses mainline development. Branch from `main` and name the branch:

- `feature/LREG-<ticket>-<short-kebab-description>`
- `hotfix/LREG-<ticket>-<short-kebab-description>`

`LREG` must be uppercase, because the GitHub ruleset rejects other branch names. Rebase onto `main`
rather than merging `main` in. Incomplete work goes behind a feature flag.

## Contributing to this project

- Follow the [Defra software development standards](https://github.com/DEFRA/software-development-standards).
- A pre-commit hook runs the security audit, format check, lint and tests. Run `npm run setup:husky` once to install it.
- Open a pull request against `main` using the PR template. CI must pass and the Sonar quality gate must be green before merge.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government licence v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of His Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
