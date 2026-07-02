# SHARPIT — Athlete Operating System

Performance operating system for endurance athletes — training load management, recovery intelligence, fatigue detection, and adaptation tracking.

## Scope and responsibilities

**What this application does:**

- Tracks training activities (run, bike, swim, strength) with load and performance metrics
- Monitors health, recovery, and sleep via Garmin, Strava, and Renpho integrations
- Computes three scientific intelligence states via a Digital Twin: Recovery, Fatigue, and Adaptation
- Provides AI-powered coaching recommendations via the Claude API
- Manages training planning, periodization, and race goal tracking

**What this application does not do:**

- Replace medical advice or clinical health assessment
- Provide real-time device data streaming (syncs are batch-based)
- Compute power curve or VO2max from device data (future capability)

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
Intelligence      Three scientific models (src/core/inference/)
  ├── Recovery v1  readiness · sleep · HRV · accumulation
  ├── Fatigue v1   load · neuromuscular · metabolic · cumulative · psychological
  └── Adaptation v1  load progression · neuromuscular efficiency · autonomic · recovery quality
      │
Digital Twin      Persistent athlete state — updated after each inference (src/core/digital-twin/)
      │
Decision Layer    AI coach context + training recommendations (src/lib/coach-context.ts)
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`docs/models/`](./docs/models/) for scientific model specifications.
ADRs are in [`docs/adr/`](./docs/adr/).

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

| Variable                            | Description                                 |
| ----------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL or Neon connection string        |
| `STRAVA_CLIENT_ID`                  | Strava API client ID                        |
| `STRAVA_CLIENT_SECRET`              | Strava API client secret                    |
| `STRAVA_REDIRECT_URI`               | `http://localhost:3000/api/strava/callback` |
| `GARMIN_CONSUMER_KEY`               | Garmin Connect API OAuth key                |
| `GARMIN_CONSUMER_SECRET`            | Garmin Connect API OAuth secret             |
| `ANTHROPIC_API_KEY`                 | Claude API key for AI coaching              |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication public key             |
| `CLERK_SECRET_KEY`                  | Clerk authentication secret key             |

## Tests

```bash
yarn test                   # all unit and integration tests
yarn test:watch             # watch mode

# Scientific benchmark suites (CI deployment gates)
yarn benchmark              # run all model benchmarks, human-readable output
yarn benchmark:json         # JSON output for CI parsing
yarn benchmark:compare      # compare v1 vs v2 model versions
```

Scientific benchmarks gate intelligence model deployment. All three models (Recovery, Fatigue, Adaptation) must score **100/100 scientific regression score** and **1.0 safety score** to pass.

## Development

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `yarn dev`        | Start in watch mode (installs deps first) |
| `yarn build`      | Production build                          |
| `yarn lint`       | ESLint                                    |
| `yarn lint:fix`   | Auto-fix lint errors                      |
| `yarn format`     | Prettier write                            |
| `yarn typecheck`  | TypeScript check without emitting         |
| `yarn db:migrate` | Run Prisma migrations (dev)               |
| `yarn db:push`    | Sync schema without migration             |
| `yarn db:studio`  | Open Prisma Studio                        |
| `yarn db:seed`    | Seed demo data                            |

## Modules

| Module        | Description                                                                   |
| ------------- | ----------------------------------------------------------------------------- |
| **Dashboard** | Daily training view with Recovery, Fatigue, and Adaptation intelligence cards |
| **Training**  | Activity CRUD (run, bike, swim, strength) with load and stream analysis       |
| **Analytics** | PMC chart (CTL, ATL, TSB), performance metrics, personal records              |
| **Planning**  | Macrocycle planning with brick analysis                                       |
| **Goals**     | Race goals and countdown tracking                                             |
| **Calendar**  | Month view of planned and completed sessions                                  |
| **Settings**  | Strava, Garmin, Renpho, Google Calendar integrations                          |

## Integrations

### Strava

1. Create an app at [strava.com/settings/api](https://www.strava.com/settings/api) (Authorization Callback Domain: `localhost`).
2. Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` in `.env`.
3. Go to **Settings → Strava → Connect**, then **Sync**.

### Garmin

Set `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET` in `.env`, then connect via **Settings → Garmin**.

### Renpho

Connect via **Settings → Renpho**. Body composition observations are automatically ingested on sync.

## Related documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — full system architecture and component interactions
- [`docs/models/`](./docs/models/) — scientific model specifications (Recovery, Fatigue, Adaptation)
- [`docs/adr/`](./docs/adr/) — Architecture Decision Records
- [`knowledge/`](./knowledge/) — domain knowledge and scientific references
