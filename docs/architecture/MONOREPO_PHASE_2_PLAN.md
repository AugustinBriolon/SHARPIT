# Monorepo phase 2 — `packages/db`, `packages/server`, `apps/api` on its own Vercel project

**Status:** Approved 2026-09-26 — steps 2a, 2b and 2c-i done · **Date:** 2026-09-26 · **Parent:** [ADR-048](../adr/ADR-048-web-repository-becomes-a-monorepo.md)

Goal: `api.sharpit.app` served by a new Vercel project `sharpit-api` built from `apps/api`, holding the
server secrets, with its own crons — while the web keeps working unchanged until phase 3. The iOS app
sees no change (same host, same `/api/v1`).

---

## 1. What the measurements say (2026-09-26)

| Fact                                                                                                                                                                                                                                                          | Consequence                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The routes `api.` serves (`/api/v1/*` — 44 routes, `/api/coach/chat`, `/api/cron/*`, App Store notifications) import ~500 files: 384 of the 677 in `src/lib`, plus `src/infrastructure`, `src/adapters`, `src/athlete-state`, `src/presentation`, `src/data`. | The server code cannot live in an app: until phase 3 both apps need it. It becomes a package, `@sharpit/server`.                                           |
| Most `/api/v1` routes re-export the legacy `/api` handler (`export { GET } from '@/app/api/…/route'`). The web UI calls 123 same-origin `/api/…` paths.                                                                                                       | Handlers move into `@sharpit/server`; each app keeps thin `route.ts` files for the routes it serves. The web keeps all of its `/api` routes until phase 3. |
| 28 route files export segment config (`maxDuration`, `runtime`, `dynamic`). Next reads it **statically** from the route file.                                                                                                                                 | Those constants stay literal in every app's `route.ts`; only the handlers are re-exported.                                                                 |
| 26 import edges go from `lib` (and friends) to `components`, `hooks` or `app`; 30 `lib` files are browser-only (React Query, icons, `'use client'`).                                                                                                          | Untangled first (step 2a); the browser-only files stay in the web app.                                                                                     |
| Crons run from `apps/web/vercel.json`; `CRON_SECRET` gates them and cron requests fail closed without it.                                                                                                                                                     | Crons move in one commit; the old project stops running them as soon as the new one does.                                                                  |

---

## 2. Decisions to approve

1. **Package names:** `@sharpit/db` (schema, migrations, client) and `@sharpit/server` (server application code).
2. **One migration owner:** `prisma migrate deploy` keeps running in the **web** project's build during phase 2 (unchanged), and moves to `sharpit-api` in phase 3, when the web loses its database. Both projects build every commit, so every schema change follows expand → deploy → contract (never drop/rename in the same deploy that stops using it).
3. **Handlers in the package, routes in the apps:** `apps/*/src/app/api/**/route.ts` = segment config + `export { GET, POST } from '@sharpit/server/handlers/…'`.
4. **Stays on the web in phase 2:** App Store Server Notifications (`/api/billing/apple/notifications`, the URL is registered in App Store Connect), the Garmin handoff (`/connect/garmin/*`, `/api/garmin/sso-callback`), every same-origin route the web UI calls.
5. **Secrets:** I create the project, its settings and every non-secret variable. **You** enter each secret value (commands listed in step 2e); I never handle them.
6. **Cutover window:** moving `api.sharpit.app` between projects removes it from one before adding it to the other — expect up to a minute of errors on `api.` (iOS retries on the next refresh). Done at a quiet hour.

---

## 3. Steps

Each step is its own branch → `main` with `yarn test`, `yarn typecheck`, `yarn lint`, `prettier --check .`, a
production build of every app, then `smoke:must-private` and `smoke:api-host` after deploy. Nothing moves a
public URL before step 2f.

### 2a — Untangle the server code from the UI (≈ ½ day)

- Remove the 26 `lib → components/hooks/app` edges: shared types move down into `lib` (or `@sharpit/core`),
  UI helpers move up into the app (e.g. `lib/today/navigation/today-state-server.ts` stops importing
  `hooks/use-today`; `lib/health/composition-metric-guides.ts` stops importing `components/corps/corps-ui`).
- The 30 browser-only `lib` files move to `apps/web/src/client-lib/` (name to confirm), their imports rewritten.
- New guard test: the future server tree imports no `react`, `@tanstack/react-query`, `lucide-react`,
  `components`, `hooks` or `'use client'` module. Replaces the grandfathered allowlist in `lib-boundary-guard`.
- **Exit:** web behaviour unchanged; guard green.
- **Done (2026-09-26):** the 26 edges were type imports — the types now live on the server side
  (`@/athlete-state/today-state`, `lib/activity/detail/types`, `lib/coach/plan/adapt-types`, …) and the UI
  modules re-export them. Browser-only helpers (`lib/query` minus its `types`, `lib/hooks`, `lib/motion`, the
  React Query cache helpers, `app-navigation`, `text-shimmer`) moved to `apps/web/src/client/`. The
  `lib-boundary` guard now forbids any `components`, `hooks`, `app`, `providers` or `client` import from the
  server tree. Kept on purpose: `lucide-react` icons in `activity-weather` and `journal-trackables` (data
  tables the server reads) and React's server-side `cache` — library dependencies, not app code.

### 2b — `packages/db` (≈ ½ day)

- `prisma/` (schema, migrations, seeds), `src/lib/prisma.ts` (the client) and the migration repair script move
  to `packages/db`; `prisma generate` runs in its `postinstall`.
- The web build command becomes `yarn workspace @sharpit/db migrate:deploy && yarn build` — same effect.
- **Exit:** a production deploy runs the migrations exactly as before (no pending migration in the log).
- **Rollback:** revert the commit; the schema itself does not change.
- **Done (2026-09-26):** `packages/db` holds `prisma/schema.prisma`, `prisma/migrations` and `src/client.ts`
  (`@sharpit/db/client`, 159 imports and mocks rewritten). The app points the Prisma CLI at it with
  `package.json#prisma.schema`, so `prisma generate`, `migrate deploy` and the repair script run unchanged with
  the app's `.env`. The seeds stay in `apps/web/prisma/` (they use app code).

### 2c — `packages/server` (≈ 1–2 days, the bulk)

- Move `src/lib` (minus the browser-only files), `src/infrastructure`, `src/adapters`, `src/athlete-state`,
  `src/presentation`, `src/data` to `packages/server/src/` keeping their sub-paths: `@/lib/x` → `@sharpit/server/lib/x`
  (same migration script as phase 1: every import resolved and rewritten, violations reported).
- Route handlers move to `packages/server/src/handlers/<same path>`; the web's `route.ts` files keep their
  segment config and re-export the handlers. Route tests move with the handlers.
- The web adds `@sharpit/server` to `transpilePackages`.
- **2c-i done (2026-09-26):** the six server roots moved (1,085 files); `@/lib/…` → `@sharpit/server/lib/…` in
  1,631 files, the package importing itself by name so its internal relative imports did not change. Tests that
  read app files (routes, pages, `globals.css`, `proxy.ts`, scripts) moved to `apps/web/src/contracts/`;
  `load-legal-page` stayed in the app (`src/legal/`). The app scripts' relative `../src/lib/…` imports — one
  of them broken since 2b, unchecked because scripts are not typechecked — now use the packages.
- **2c-ii (next):** route handlers into `packages/server/src/handlers/`.
- **Exit:** identical behaviour; every test green in its new workspace.

### 2d — `apps/api` (≈ ½ day)

- A Next.js app with **no pages**: `src/app/api/v1/**`, `src/app/api/coach/chat`, `src/app/api/cron/**` as thin
  route files; its `proxy.ts` = the `api.` guards (JSON only, Bearer only, no cookies, CORS `web.` only,
  `no-store`) + Clerk Bearer authentication + the per-athlete rate limit.
- `vercel.json`: function durations for its routes; **no crons yet**; install `yarn install --immutable`; build
  `yarn build` (no migrations — decision 2).
- Local dev: `turbo dev` runs web on 3000 and api on 3001.
- **Exit:** `apps/api` builds; its route tests pass; `smoke:api-host` passes against `next start` locally.

### 2e — Vercel project `sharpit-api` (≈ 1 h + your secret entry)

- I create it with `vercel api`: framework Next.js, Root Directory `apps/api`, same Git repository, production
  branch `main`, ignored build step for commits that do not touch `apps/api` or a package it uses.
- I add the non-secret variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `COACH_MODEL`,
  `FEATURE_ENGINE_ENABLED`, `SHARPIT_DEFAULT_*`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`,
  `APNS_PRODUCTION`, `APPLE_TEAM_ID`, `LANGFUSE_BASE_URL`, `LANGFUSE_PUBLIC_KEY`).
- **You** add the secrets, one command each, value pasted by you:
  `vercel env add <NAME> production --cwd apps/api` for `CLERK_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL`,
  `SECRET_ENCRYPTION_KEY`, `AI_GATEWAY_API_KEY`, `APNS_PRIVATE_KEY`, `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, `LANGFUSE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`, `WITHINGS_REDIRECT_URI`. `CRON_SECRET` waits for 2g.
- First production deploy on `sharpit-api.vercel.app`; smoke there with a Bearer (the host guards only apply
  on `api.sharpit.app`, so this checks the handlers, database and Clerk wiring).

### 2f — Cutover of `api.sharpit.app` (≈ 15 min, at a quiet hour)

- Remove `api.sharpit.app` from `sharpit`, add it to `sharpit-api` (`vercel api`), wait for the certificate.
- `yarn web smoke:api-host` → all `PASS`; on the iPhone: Today, pull-to-refresh, coach, Garmin connect.
- **Rollback:** move the domain back (same two calls); the web project still serves `/api/v1`.

### 2g — Crons and secret shrink (≈ ½ hour + one cron cycle)

- One commit moves `crons` from `apps/web/vercel.json` to `apps/api/vercel.json`. You add `CRON_SECRET` to
  `sharpit-api` before it deploys.
- After the next scheduled run succeeds on `sharpit-api` (logs), you remove `CRON_SECRET` and `APNS_*` from
  `sharpit`: the public HTML project no longer holds the push key nor the cron secret.
- **Exit:** runbook step 7 done; ADR-048 phase 2 marked done.

---

## 4. Risks

| Risk                                                                            | Mitigation                                                                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Both projects deploy the same commit in any order                               | Migrations stay in one project; expand → contract schema changes only.                                                                |
| A handler depends on the host it runs on (`appOrigin`, Garmin origins, cookies) | `NEXT_PUBLIC_APP_URL` set on both projects; Garmin handoff stays on the web; cookie use forbidden under `api.` (existing test).       |
| `api.` down during the domain move                                              | Quiet hour, rollback = move back, iOS refresh retries.                                                                                |
| Crons running twice or not at all                                               | Moved in one commit; `CRON_SECRET` only on the project that should run them.                                                          |
| Import rewrite of ~700 files breaks something subtle                            | Same resolver-based script as phase 1, which reports every package → app import; full suites + builds of both apps before each merge. |

## 5. What stays for phase 3

The web stops reading the database: its UI calls `api.` with a Bearer, its own `/api` routes and
`@sharpit/server` dependency go away, migrations and App Store notifications move to `sharpit-api`, and the web
project loses `DATABASE_URL`, `SECRET_ENCRYPTION_KEY`, AI and provider keys.
