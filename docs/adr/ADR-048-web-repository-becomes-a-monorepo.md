# ADR-048: The web repository becomes a monorepo — one app and one Vercel project per host

**Status:** Accepted — phases 0 to 3 done (2026-09-26)  
**Date:** 2026-09-26  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A — refines steps 5, 7, 8 and 9 of the host split ([runbook](../architecture/HOST_SPLIT_RUNBOOK.md))

---

## Context

SHARPIT's web repository is one Next.js app deployed as one Vercel project (`sharpit`) that answers four hosts: `sharpit.app`, `www.`, `web.` and `api.` ([inventory](../architecture/HOSTS_INVENTORY.md)). The host split's target is:

- `api.sharpit.app` — JSON + Clerk Bearer only (the iOS contract `/api/v1`, the coach stream, crons);
- `web.sharpit.app` — a thin UI (auth, Connect Garmin, Today reading, account);
- `sharpit.app` — the platform shell (AASA, `/connect/*`, athlete landing, `/docs`).

The `api.` guards are live (`src/lib/hosts/api-host.ts`), but everything else is shared:

- **Every push rebuilds and redeploys everything.** A copy change on a web page redeploys the API, the crons and the AASA.
- **Every deployment holds every secret.** Database, `SECRET_ENCRYPTION_KEY`, APNs `.p8`, `CRON_SECRET`, AI and provider keys are readable by the deployment that also renders public HTML.
- **A second Vercel project on this same app would not fix either** (considered on 2026-09-26): both projects would build the whole app on every push, and the web pages would still need the database — they read it directly.

Measured on 2026-09-26: 2,645 TypeScript files; `src/core` (pure domain, 1.8 MB), `src/lib` (server and shared libraries, 6.8 MB), `src/components` (5 MB), `src/app` (1.3 MB, 40 route folders under `src/app/api`). The UI already talks to route handlers through fetchers (`ARCHITECTURE.md` §2.1); only 15 files under `src/app/(app)` and `src/components` import Prisma, the queries or `getCurrentAthleteId` directly.

---

## Decision

Turn `SHARPIT-WEBAPP` into a Yarn workspaces + Turborepo monorepo with one Next.js app per host and one Vercel project per app. SHARPIT-APP (iOS) stays a separate repository; it only sees URLs.

```
SHARPIT-WEBAPP/
├── apps/
│   ├── api/   → Vercel "sharpit-api" → api.sharpit.app  (/api/v1, /api/coach/chat, /api/presentation until migrated, crons)
│   ├── web/   → Vercel "sharpit-web" → web.sharpit.app  (thin UI, no database)
│   └── hub/   → Vercel "sharpit"     → sharpit.app      (AASA, /connect/*, landing, /docs, /terms, /privacy)
└── packages/
    ├── core/      ← src/core            (pure domain, no I/O)
    ├── db/        ← prisma/, src/lib/prisma, queries (Prisma 6 client and schema)
    └── shared/    ← framework-free helpers both sides need (dates, formatting, copy, brand tokens)
```

Rules:

1. **Only `apps/api` (and the hub's Garmin handoff, below) depends on `packages/db`.** `apps/web` never imports it: it reads and writes through `api.` over HTTP.
2. **The web calls `api.` with a Clerk Bearer.** Browser fetchers send `Authorization: Bearer <session token>` from Clerk's `getToken()` (the `api.` CORS allowlist already names `https://web.sharpit.app` only); server components use `auth().getToken()`. Clerk cookies never leave `web.`.
3. **Each Vercel project builds only when its app or a package it uses changed** (Root Directory `apps/<name>`, ignored build step `npx turbo-ignore`).
4. **Each project holds only its own secrets** (inventory §4): APNs, `CRON_SECRET`, AI and provider keys on `sharpit-api` only.
5. **`vercel.json` crons and function durations move to `apps/api`.**

---

## Rationale

- Deploy isolation: a web-only commit rebuilds `apps/web`; an API fix does not touch the landing or the AASA.
- Secret isolation for real: the thin web and the hub have no APNs key, no `CRON_SECRET`, no AI key; the thin web has no database.
- One repository still: `core` and `db` types are shared by import, a cross-cutting change is one commit, one review, one CI run.
- Incremental: each phase below ships on its own and keeps every host and the iOS contract unchanged.

---

## Alternatives Considered

### Alternative 1: Several Vercel projects on the current single app

**Description:** Create `sharpit-api` from the same repository and move `api.sharpit.app` to it.

**Pros:**

- Hours, not days; separate logs and rollbacks per host.

**Cons:**

- Both projects build the whole app on every push: no deploy isolation.
- The web pages still read the database, so the web project keeps almost every secret.

**Rejected because:** it brings the cost of two projects without their benefits (decided 2026-09-26).

### Alternative 2: Separate repositories per app

**Description:** `sharpit-api`, `sharpit-web`, `sharpit-hub`, with `core` and `db` published as packages.

**Pros:**

- Hard boundaries; independent histories.

**Cons:**

- `core` and `db` must be versioned and published; a schema change needs coordinated releases across repositories.
- Tooling (lint, formatter, tests, husky, CI) duplicated three times — heavy for a solo maintainer.

**Rejected because:** a monorepo gives the same deploy and secret isolation without the release coordination.

### Alternative 3: Status quo

**Description:** One app, one project, `api.` guarded in the proxy.

**Pros:**

- No migration; the guards already enforce the `api.` contract.

**Cons:**

- Every deploy ships everything; every deployment holds every secret.

**Rejected because:** acceptable today, not as the web shrinks to a thin UI and the API becomes the product's contract.

---

## Migration plan

Each phase is its own branch and pull request, ends with `yarn test`, `yarn typecheck`, `yarn lint`, `prettier --check .`, `yarn smoke:must-private https://sharpit.app https://web.sharpit.app` and `yarn smoke:api-host`, and changes no public URL.

| Phase            | Content                                                                                                                                                                                                                                                                              | Vercel                                                                                                                | Exit check                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 0. Workspace     | Yarn workspaces + Turborepo; move the whole app to `apps/web` unchanged (`git mv`, history kept); root scripts delegate to Turbo.                                                                                                                                                    | `sharpit`: Root Directory → `apps/web`                                                                                | Production identical; smokes green                                                            |
| 1. Packages      | Extract `packages/core` and `packages/shared` (see _Phase 1 as shipped_); replace `@/core` imports. Behaviour unchanged.                                                                                                                                                             | none                                                                                                                  | Full test suite green                                                                         |
| 2. API app       | Extract `packages/db` (schema, client, migrations). Create `apps/api`: move `src/app/api/**`, the server libraries it needs, the `api.` proxy guards, crons and function durations. Extend the `api.` allowlist to `/api/presentation/*` for the web until it migrates to `/api/v1`. | New `sharpit-api` (Root `apps/api`), full server env; move `api.sharpit.app` to it                                    | iOS on device: Today, sync, coach, Garmin; `smoke:api-host`                                   |
| 3. Web on `api.` | Fetchers and the 15 direct-database UI files call `api.` with a Bearer; remove `packages/db` from `apps/web`. Thin-web removals (step 9) land here once the team validates them.                                                                                                     | `sharpit-webapp` (renamed from `sharpit`) loses database, APNs, `CRON_SECRET`, AI keys; `web.sharpit.app` stays on it | Web smoke on `web.`; no Prisma import under `apps/web` (lint rule)                            |
| 4. Hub           | Create `apps/hub`: AASA, `/connect/*` (with its Garmin SSO callback), `/terms`, `/privacy`, landing, `/docs` (step 8).                                                                                                                                                               | New `sharpit-hub` (Root `apps/hub`) takes the apex and `www.`; `sharpit-webapp` keeps `web.`                          | `smoke:must-private https://sharpit.app`; universal-link tap; Garmin in-app session on device |

---

## Phase 1 as shipped (2026-09-26)

Measured before moving: `src/core` was not self-contained — its import closure reached 280 files, 52 of them touching Prisma, React or Next. Most of it came from four folders that are not domain, and from a handful of pure helpers the domain borrowed from `lib`. Phase 1 therefore shipped as:

- `packages/core` (`@sharpit/core`): observation, features, inference, digital twin, decision, scenario, science, projection, environment, physical health, planned session, product insight, benchmarks, dev — plus `training/` (`foster-session-load`, `training-day`, from `lib/training`), `sleep/targets` (`SLEEP_TARGET_MIN`) and the in-memory dev repositories. It imports nothing from the app; only Prisma's enum types (`ActivityType`, `SessionIntensity`).
- Stayed in the app, renamed out of `core`: `src/presentation` (view models — they consume web presentation types), `src/adapters` (provider payloads → observations), `src/athlete-state` (the Today snapshot carries display copy), `src/architecture` (guards over the whole app).
- `packages/shared` (`@sharpit/shared`): `value` (`isSet`, `formatStatBit`). Other shared helpers move when phase 2 shows which ones both apps need.
- `packages/eslint-config`: the lint rules, extended by every workspace.
- **Deferred to phase 2:** `packages/db`. Moving the Prisma schema changes the production migration path and brings nothing while one app owns the database; the queries depend on the provider integrations, so they go to `apps/api`, not to `db`.

---

## Consequences

### Positive

- A web-only change no longer redeploys the API, the crons or the AASA; fewer build minutes.
- Secrets live where they are used; the public HTML hosts cannot read APNs, `CRON_SECRET` or AI keys.
- The iOS contract is untouched throughout: same hosts, same `/api/v1`.

### Negative

- Several days of mechanical migration (import paths, tests, configs); phase 1 touches most files.
- The web adds a network hop (web → `api.`) on reads that are in-process today; Today and the rich pages must lean on HTTP caching and the presentation layer.
- The hub's Garmin handoff (`/connect/garmin/*` and `/api/garmin/sso-callback`) writes Garmin tokens, so `sharpit-hub` keeps the database URL, `SECRET_ENCRYPTION_KEY` and the Clerk secret — but no APNs, cron or AI key. Moving the ticket exchange behind `api.` would remove them; out of scope here.
- Local development runs three apps (`turbo dev`, ports 3000/3001/3002); the iOS Debug origin points at the API app's port; Playwright targets per app.
- ADR-040's note that presentation routes are web-only still holds, but they are served by `apps/api` until each moves to `/api/v1`.

### Scientific debt created

- None.

---

## Review Criteria

- If phase 2 shows the web → `api.` hop degrades Today's first paint beyond the Instant UX budget (`docs/INSTANT_UX_ARCHITECTURE.md`), revisit rule 1 for Today only (a server-side read in `apps/web` through `packages/db`, read-only role).
- If Vercel's monorepo support stops skipping unaffected projects, reconsider Alternative 2.
- If the web grows back into a rich client, revisit whether `apps/web` and `apps/hub` should merge.
