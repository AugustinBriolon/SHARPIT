# SHARPIT — Athlete Operating System

Performance operating system for endurance athletes — training load management, recovery intelligence, fatigue detection, and adaptation tracking.

## Scope and responsibilities

**What this application does:**

- Tracks training activities (run, bike, swim, strength) with load and performance metrics
- Monitors health, recovery, and sleep via Garmin, Strava, and Renpho integrations
- Computes four scientific intelligence states via a Digital Twin: Recovery, Fatigue, Adaptation, and cross-model Reasoning
- Provides AI-powered coaching recommendations via the Claude API
- Manages training planning, periodization, and race goal tracking
- Sends structured sessions to a Garmin watch — steps, repeat groups, and pace, power or heart-rate targets derived from the athlete's own thresholds
- Serves the same twin at two reading densities — Essential hides the technical metric layer, Expert exposes it ([ADR-023](./docs/adr/ADR-023-reading-density-expert-mode.md))

**What this application does not do:**

- Replace medical advice or clinical health assessment
- Provide real-time device data streaming (syncs are batch-based)
- Compute power curve or VO2max from device data (future capability)
- Guide open-water swimming — Garmin structures pool sessions only

**Main dependencies:**

- **Neon / PostgreSQL** — persistent storage for activities, health, and Digital Twin state
- **Garmin Connect API** — activity and health data sync
- **Strava API** — activity sync
- **Anthropic Claude API** — AI coach reasoning and recommendations

## Architecture

SHARPIT is a Next.js application with a layered intelligence system:

```
Sync Layer        Garmin / Strava / Renpho / Sleep — batch ingestion
      │
Observation       Raw data normalization and validation (src/core/observation/)
      │
Feature Engine    Structured feature extraction per training day (src/core/features/)
      │
Intelligence      Scientific inference models (src/core/inference/)
  ├── Recovery v1    readiness · sleep · HRV · accumulation
  ├── Fatigue v1     load · neuromuscular · metabolic · cumulative · psychological
  ├── Adaptation v1  load progression · neuromuscular efficiency · autonomic · recovery quality
  └── Reasoning v1   cross-model synthesis — OverallVerdict, conflicts, opportunities (reads Digital Twin)
      │
Digital Twin      Persistent athlete state — updated after each inference (src/core/digital-twin/)
      │
Decision Layer    AI coach context + training recommendations (src/lib/coach/coach-context.ts)
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) (code conventions) and [`docs/domain/DOMAIN.md`](./docs/domain/DOMAIN.md) (domain concepts and pipeline).
Model specs: [`docs/models/README.md`](./docs/models/README.md). ADRs: [`docs/adr/`](./docs/adr/).

## Documentation — start here

Read these **six documents** in order (~4–6 hours):

| #   | Document                                                             | Purpose                                    |
| --- | -------------------------------------------------------------------- | ------------------------------------------ |
| 0   | This README                                                          | Setup and orientation                      |
| 1   | [`docs/product/PRODUCT.md`](./docs/product/PRODUCT.md)               | Constitution, execution, athlete journey   |
| 2   | [`ARCHITECTURE.md`](./ARCHITECTURE.md)                               | Code structure and conventions             |
| 3   | [`docs/domain/DOMAIN.md`](./docs/domain/DOMAIN.md)                   | Domain concepts, Digital Twin, system flow |
| 4   | [`docs/models/README.md`](./docs/models/README.md)                   | Inference model index                      |
| 5   | [`docs/design/DESIGN_LANGUAGE.md`](./docs/design/DESIGN_LANGUAGE.md) | Visual and interaction law                 |

**Supporting:** [`knowledge/README.md`](./knowledge/README.md) · [`docs/engineering/`](./docs/engineering/) · [`docs/audits/`](./docs/audits/) · [`docs/archive/`](./docs/archive/)

Moved documents leave a redirect stub at their old path.

## Getting Started

### Prerequisites

- Node.js >= 20
- Yarn >= 4
- PostgreSQL >= 16 or a [Neon](https://neon.tech) serverless database

### Database setup

```bash
# Option A — Neon (recommended)
# Create a project at neon.tech, copy the connection string to DATABASE_URL in .env

# Option B — Docker
yarn db:up

# Option C — Local PostgreSQL (macOS)
brew install postgresql@16
brew services start postgresql@16
createuser sharpit --createdb 2>/dev/null; \
  psql postgres -c "ALTER ROLE sharpit WITH LOGIN PASSWORD 'sharpit';" && \
  createdb sharpit -O sharpit
```

### Installation

```bash
cp .env.example .env   # fill in required values (see Environment variables below)
yarn install
yarn db:migrate        # run all migrations
yarn db:seed           # optional demo data
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

> After any Prisma schema modification, restart `yarn dev` to reload the generated client.

### Environment variables

| Variable                            | Description                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                      | PostgreSQL or Neon connection string                                                                         |
| `STRAVA_CLIENT_ID`                  | Strava API client ID                                                                                         |
| `STRAVA_CLIENT_SECRET`              | Strava API client secret                                                                                     |
| `STRAVA_REDIRECT_URI`               | `http://localhost:3000/api/strava/callback`                                                                  |
| `GARMIN_CONSUMER_KEY`               | Garmin Connect API OAuth key                                                                                 |
| `GARMIN_CONSUMER_SECRET`            | Garmin Connect API OAuth secret                                                                              |
| `ANTHROPIC_API_KEY`                 | Claude API key for AI coaching                                                                               |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication public key                                                                              |
| `CLERK_SECRET_KEY`                  | Clerk authentication secret key                                                                              |
| `DEV_BYPASS_CLERK`                  | Dev only: set `true` to skip Clerk when the corporate proxy blocks `*.clerk.accounts.dev` (see below)        |
| `UPSTASH_REDIS_REST_URL`            | Upstash Redis REST URL. Coach/sync/AI routes **fail closed** if unset; `apiGeneral` still fails open         |
| `UPSTASH_REDIS_REST_TOKEN`          | Upstash Redis REST token, paired with the URL above                                                          |
| `CRON_SECRET`                       | Bearer secret for `/api/cron/*` (incl. `/api/cron/smoke`). Rejects all cron calls if unset                    |
| `SECRET_ENCRYPTION_KEY`             | Required in production to encrypt provider credentials (`src/lib/secret-box.ts`)                             |
| `ADMIN_EMAILS`                      | Comma-separated emails allowed on `/admin` and `/api/dev/*`                                                  |

Ops smoke (no secret values leaked):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/smoke
```

#### Corporate proxy / Wi‑Fi entreprise

Clerk needs outbound HTTPS from **your browser** and from **Node** (`yarn dev`) to `*.clerk.accounts.dev` and `clerk.com`. A corporate proxy often blocks or MITM’s these calls: you stay on `/sign-in?redirect_url=…` in a loop.

1. **Confirm** — DevTools → Network: failed requests to `clerk` / `accounts.dev` after login.
2. **Proxy for Node** (replace with your corporate proxy URL):

   ```bash
   export HTTPS_PROXY=http://proxy.corp:8080
   export HTTP_PROXY=http://proxy.corp:8080
   export NO_PROXY=localhost,127.0.0.1
   yarn dev
   ```

3. **SSL inspection** — if IT provides a root CA: `export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem`
4. **Local dev only** — add `DEV_BYPASS_CLERK=true` to `.env`, restart `yarn dev`, open `http://localhost:3000/` (not production-safe).

## Tests

```bash
yarn test                   # all unit and integration tests
yarn test:watch             # watch mode
yarn test:e2e               # Playwright, production build — prefetched shells
yarn test:e2e:dev           # Playwright, against a running `yarn dev` — structural specs

# Scientific benchmark suites (CI deployment gates)
yarn benchmark              # run all model benchmarks, human-readable output
yarn benchmark:json         # JSON output for CI parsing
yarn benchmark:compare      # compare v1 vs v2 model versions
```

Scientific benchmarks gate intelligence model deployment. All four models (Recovery, Fatigue, Adaptation, Reasoning) must score **100/100 scientific regression score** and **1.0 safety score** to pass.

The e2e suite has two modes ([ADR-010](docs/adr/ADR-010-cache-components-and-instant-navigation.md)).
`yarn test:e2e` builds and starts the app, because anything asserting what a navigation shows _before_
the server answers needs a prefetched shell, and `next dev` disables prefetching. It covers the routes
reachable without a session.

`yarn test:e2e:dev` runs the structural specs against a `yarn dev` you already have up, where
`DEV_BYPASS_CLERK` stands in for a session — so the athlete's routes are covered with no credential to
record and nothing that can expire.

## Development

| Command                                          | Description                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `yarn dev`                                       | Start in watch mode (installs deps first)                                         |
| `yarn build`                                     | Production build                                                                  |
| `yarn lint`                                      | ESLint                                                                            |
| `yarn lint:fix`                                  | Auto-fix lint errors                                                              |
| `yarn format`                                    | Prettier write                                                                    |
| `yarn typecheck`                                 | TypeScript check without emitting                                                 |
| `yarn db:migrate`                                | Run Prisma migrations (dev)                                                       |
| `yarn db:push`                                   | Sync schema without migration                                                     |
| `yarn db:studio`                                 | Open Prisma Studio                                                                |
| `yarn db:seed`                                   | Seed demo data                                                                    |
| `yarn db:backfill:body-composition-observations` | Backfill `BODY_COMPOSITION` observations from stored Withings/Renpho measurements |
| `yarn db:recompute:fuel-features`                | Recompute FUEL feature sets for days with nutrition data (after weight backfill)  |

## Modules

| Module          | Route                                       | Description                                                                                                                                                                                    |
| --------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**       | `/`                                         | Daily Brief — physiological score cards (Recovery, Effort, Sleep) + narrative decision center (what to do, why, session, health signals, confidence) via the Reasoning Engine and Digital Twin |
| **Drill-downs** | `/today/{sleep,recovery,effort,adaptation}` | One page per Digital Twin dimension; the Effort drill-down carries the PMC chart (CTL, ATL, TSB)                                                                                               |
| **Training**    | `/training`                                 | The thread — planned and completed sessions in one timeline, merging calendar, planning and history; activity CRUD (run, bike, swim, strength) with load and stream analysis                   |
| **Planning**    | `/training/planning`                        | Macrocycle planning with brick analysis; session authoring and push to the Garmin watch                                                                                                        |
| **Progression** | `/progress`                                 | Goals, personal records and power curve, threshold calibration, body composition trends, physical-health tracking                                                                              |
| **Nutrition**   | `/nutrition`                                | Daily fuelling read from MyFitnessPal, with weight-aware ratios; macro trend (protein/carbs/fat, week/month/year) averaged per logged day                                                      |
| **Coach**       | `/coach`                                    | Conversations plus the session, weekly-brief and plan-adjustment entry points                                                                                                                  |
| **Settings**    | `/settings/*`                               | Strava, Garmin, Renpho, Google Calendar integrations; threshold calibration (FTP, LTHR, threshold pace, swim CSS, pool length); theme and reading density (Essential / Expert)                 |

The athlete-facing hierarchy these routes are migrating toward is defined in
[INFORMATION_ARCHITECTURE.md](./docs/design/INFORMATION_ARCHITECTURE.md) and decided in
[ADR-022](./docs/adr/ADR-022-temporal-product-navigation.md).

## Integrations

### Strava

1. Create an app at [strava.com/settings/api](https://www.strava.com/settings/api) (Authorization Callback Domain: `localhost`).
2. Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` in `.env`.
3. Go to **Settings → Strava → Connect**, then **Sync**.

### Garmin

Set `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET` in `.env`, then connect via **Settings → Integrations → Garmin**.

Garmin is the only integration SHARPIT **writes** to. A planned session can be sent to
Connect as a structured workout, scheduled on the athlete calendar, and picked up by the
watch on its next sync — see [Watch workouts](#watch-workouts).

### Renpho

Connect via **Settings → Renpho**. Body composition observations are automatically ingested on sync.

## Watch workouts

Planned run, bike and swim sessions are sent to Garmin Connect as structured workouts. The
watch guides each step and alerts when the athlete leaves the prescribed band.

**How targets are produced.** A session stores its steps with targets expressed _relative_ to
the athlete's references — percent of threshold speed, FTP or CSS — and they are resolved into
absolute numbers at push time, against the thresholds in force that day. A session planned
weeks ahead therefore leaves with current numbers, and one already on the watch is flagged
when a reference it depends on moves ([ADR-016](./docs/adr/ADR-016-endurance-prescription-relative-targets.md)).

**What carries a target.** Work steps do. Warm-up, recovery, rest and cool-down do not: they
are defined by being easy rather than by holding a number
([ADR-020](./docs/adr/ADR-020-readable-easy-bands.md)).

**Per sport:**

| Sport | Target              | Reference                  | Notes                                                     |
| ----- | ------------------- | -------------------------- | --------------------------------------------------------- |
| Run   | Pace band (`/km`)   | `runThresholdPaceSecPerKm` | Falls back to heart rate when no threshold pace is set    |
| Bike  | Power band (watts)  | `ftpW`                     | Explicit watts, never a Connect zone index                |
| Swim  | Pace band (`/100m`) | `swimCssSecPer100m`        | Stroke per step; pool length required; no fallback metric |

Thresholds are set or estimated under **Progression → Performance** (`/progress?tab=performance`). Swim CSS is estimated from
realised pool sessions ([ADR-021](./docs/adr/ADR-021-swim-css-from-session-pace.md)).

A session with no authored structure is still sent, as a single timed step derived from its
duration and intensity, and reported as derived rather than prescribed.

## Related documentation

- [`docs/product/PRODUCT.md`](./docs/product/PRODUCT.md) — canonical product document
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — engineering handbook
- [`docs/domain/DOMAIN.md`](./docs/domain/DOMAIN.md) — domain concepts and Digital Twin
- [`docs/models/README.md`](./docs/models/README.md) — inference model index
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records
- [`docs/design/DESIGN_LANGUAGE.md`](./docs/design/DESIGN_LANGUAGE.md) — design language
- [`docs/design/INFORMATION_ARCHITECTURE.md`](./docs/design/INFORMATION_ARCHITECTURE.md) — athlete-facing navigation and surface hierarchy
- [`docs/adr/ADR-016`](./docs/adr/ADR-016-endurance-prescription-relative-targets.md) · [`ADR-017`](./docs/adr/ADR-017-endurance-prescription-authoring.md) · [`ADR-020`](./docs/adr/ADR-020-readable-easy-bands.md) · [`ADR-021`](./docs/adr/ADR-021-swim-css-from-session-pace.md) — watch workouts
- [`knowledge/README.md`](./knowledge/README.md) — scientific reference corpus
- [`docs/DOCUMENTATION_MIGRATION_PLAN.md`](./docs/DOCUMENTATION_MIGRATION_PLAN.md) — consolidation map (July 2026)
