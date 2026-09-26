# Monorepo phase 3 — the web calls `api.` and loses its database

**Status:** Done 2026-09-26 except removing the web project's server variables (manual, §7) · **Date:** 2026-09-26 · **Parent:** [ADR-048](../adr/ADR-048-web-repository-becomes-a-monorepo.md)

Goal: `web.sharpit.app` (and the apex pages the web project still serves) read and write everything through
`api.sharpit.app` with a Clerk Bearer. `apps/web` stops depending on the database, and the `sharpit-webapp` Vercel project
keeps only Clerk keys and public configuration. `sharpit-api` becomes the only holder of server secrets and the only
migration owner. The iOS app sees no change. Every public URL and the `/connect/*` + AASA contract on the apex stay
as they are.

---

## 1. What the measurements say (2026-09-26)

| Fact                                                                                                                                                                                                                                                                                                                                                    | Consequence                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web` still mounts 119 `/api/*` route files. Every handler already lives in `@sharpit/server/handlers/*` (phase 2); the route files are thin re-exports.                                                                                                                                                                                           | Mounting them on `apps/api` costs a copy of thin files, no logic move. The `route-mounts` contract keeps both mounts identical until the web copies are deleted. |
| The web UI calls them from 54 files, mostly through `client/query` (`shared.ts`, `send-json.ts`, `presentation-fetchers.ts`), plus the coach stream (`use-coach-chat.ts`, `api: '/api/coach/chat'`).                                                                                                                                                    | One `apiFetch` (origin + Bearer) replaces the relative `fetch('/api/…')`; the chat transport gets the same headers.                                              |
| Of the 269 `@sharpit/server/*` modules the web UI imports, 250 are pure (formatting, view models, labels; Prisma **enum values** only, which are browser-safe). 19 reach the database client or `server-only`.                                                                                                                                          | No new package is needed. A contract test forbids the 19 (and anything that reaches `@sharpit/db/client`) from `apps/web`; the pure modules stay where they are. |
| 23 non-API web files reach those 19 modules: 9 pages (`activite/[id]`, `activite/[id]/edit`, `activite/sejours/[id]`, `coach`, `journal/analyses`, `moi/calibration`, `settings/account`, `settings/equipment`, `admin`), `onboarding/page`, 4 route handlers (`/start`, `/demo`, `/integrations/connected`, `/connect/garmin/start`) and 9 components. | Each one switches to a server-side `api.` call (`auth().getToken()`) or to the client fetchers. Listed one by one in step 3c.                                    |
| OAuth connects (Strava, Withings, Google, MyFitnessPal) keep their CSRF `state` in a cookie on the web origin and receive the provider callback on the web origin. A browser navigation cannot carry a Bearer, and `api.` never sets cookies.                                                                                                           | Connect and callback move to `api.` with a **signed `state`** (HMAC, athlete id + expiry — the Garmin SSO state already works this way). Redirect URIs change.   |
| `/api/billing/apple/notifications` is registered in App Store Connect on the apex. Migrations run in the `sharpit-webapp` build.                                                                                                                                                                                                                        | Both move to `sharpit-api`; App Store Connect gets the new URL (you change it).                                                                                  |

---

## 2. Decisions to approve

1. **Same paths on `api.`.** The web's routes are served on `api.sharpit.app` under their current paths (`/api/presentation/today`, …), not renamed into `/api/v1`. `/api/v1` stays the iOS contract, versioned; the web routes are the web's private contract, deployed with it. The `api.` allowlist grows from "v1 + coach/chat + crons" to "every mounted `/api/*` route"; the guards (Bearer only, 401, no cookies, CORS `https://web.sharpit.app` only, `private, no-store`, rate limit) apply unchanged.
2. **One switch, reversible.** `NEXT_PUBLIC_API_ORIGIN` on the web project. Unset → relative `/api/…` (today's behaviour). Set to `https://api.sharpit.app` → every call goes to `api.` with a Bearer. Rollback = unset the variable and redeploy.
3. **Apex pages go through the same `api.`.** The web project also serves apex pages (`sharpit.app/…`). The CORS allowlist adds `https://sharpit.app` **only while** those pages exist (removed in phase 4, when the hub takes the apex). This is the one deviation from "CORS web only"; the alternative is redirecting every signed-in apex page to `web.` first, which is a UX change for step 9.
4. **OAuth with signed state.** `POST /api/<provider>/connect` (Bearer) returns `{ authorizeUrl }` with `state = HMAC(athleteId, provider, nonce, exp)`. The callback on `api.` verifies the state, stores the tokens and answers `302` to `https://web.sharpit.app/integrations/connected?provider=…`. No cookie anywhere. Redirect URIs become `https://api.sharpit.app/api/<provider>/callback` — **you** update them in the Strava, Withings, Google and MyFitnessPal consoles (and the `*_REDIRECT_URI` variables on `sharpit-api`).
5. **`/connect/garmin/*` stays on the apex, unchanged for iOS.** `sharpit.app/connect/garmin/start` keeps its URL; its handler calls `api.` server-side (handoff ticket → Clerk session on the apex → `auth().getToken()` → `POST api./api/garmin/sso/start`). `/api/garmin/sso-callback` moves to `api.` like any other route.
6. **Today's first paint.** The web Today already renders from the client cache + `/api/presentation/today`; the extra hop is browser → Paris edge → London function (same as iOS). If step 3e measures a regression beyond the Instant UX budget, ADR-048's escape hatch (read-only server-side read for Today) is proposed separately — not built by default.
7. **Thin-web removals (step 9) are not in this phase.** No page disappears; that needs your UX validation.
8. **Secrets:** unchanged rule — I remove variables with the CLI; you enter any new secret value.

---

## 3. Steps

Each step is its own commit (or small branch) → `main`, with `yarn test`, `yarn typecheck`, `yarn lint`,
`prettier --check .`, a production build of both apps, then `smoke:must-private` and `smoke:api-host` after deploy.

### 3a — `api.` serves every web route (additive)

- Copy the 119 thin `route.ts` files into `apps/api/src/app/api/` (except `dev/*` in production builds, as today).
- `API_HOST_PATHS` becomes "any path with a mounted handler under `/api/`"; the cron rule stays.
- Contracts: `route-mounts` (shared mounts identical), `api-routes-set-no-cookie` (now covers every handler — cookie-setting handlers are listed and fixed in 3b before they are exposed), a smoke that `GET api./api/presentation/today` without Bearer → 401 JSON.
- Nothing calls the new mounts yet. Deploy, smoke.

### 3b — Cookie-free handlers

- OAuth connects/callbacks → signed state (decision 4), a shared `oauth-state` module with tests (expiry, tamper, wrong provider).
- `athlete-profile` tier cookie, `demo/exit`, `privacy/consent` and any other handler the no-cookie contract flags: the cookie becomes web-side state set by the web from the JSON answer, or disappears when only the web read it.
- Callback redirect targets (`/integrations/connected`) become absolute `https://web.sharpit.app/…` (configurable per environment).

### 3c — The web switches behind `NEXT_PUBLIC_API_ORIGIN`

- `client/query/api-fetch.ts`: `apiFetch(path, init)` = origin from the env + `Authorization: Bearer ${await getToken()}`; used by `shared.ts`, `send-json.ts`, `presentation-fetchers.ts`, `athlete-snapshot-fetch.ts` and the remaining direct `fetch('/api/…')` call sites; the coach transport gets a `headers` function.
- Server side: `server/api-client.ts` (server-only) — same thing with `auth().getToken()`, for the 9 pages, `onboarding/page`, `/start`, `/demo`, `/integrations/connected`, `/connect/garmin/start`. Each file is rewritten to call it (or to hand off to the client fetchers where the page is already client-driven).
- The 9 components that reach the database do so through a helper next to a query; the pure helper is split from the query.
- Local dev: `api` on `:3001`, web on `:3000`, CORS allows `http://localhost:3000` only when `NODE_ENV=development`.
- Contract: no file under `apps/web` reaches `@sharpit/db/client` or `server-only` server code (the closure scan used for the measurement above, as a test).

### 3d — Moves on `sharpit-api`

- `prisma migrate deploy` moves to the `sharpit-api` build (removed from `sharpit-webapp` in the same commit).
- App Store notifications served on `api.`; you change the URL in App Store Connect (production + sandbox); the old apex route stays one week, then goes.

### 3e — Cutover

- Set `NEXT_PUBLIC_API_ORIGIN=https://api.sharpit.app` on `sharpit-webapp` (production), redeploy.
- Checks: must-private 6/6, api-host smoke, web Today / coach / a Strava connect / Garmin connect from iOS; Today first paint compared with before (decision 6).
- Rollback: unset, redeploy.

### 3f — Removal and secret shrink (after ≥ 24 h green)

- Delete `apps/web/src/app/api/**` (except what the apex must keep: AASA, `/connect/*`), `@sharpit/db` and the Prisma scripts from `apps/web`.
- Lint/contract: `@sharpit/db` and `@prisma/client` runtime imports forbidden under `apps/web`.
- Remove from `sharpit-webapp`: `DATABASE_URL`, `DIRECT_URL`, `SECRET_ENCRYPTION_KEY`, `AI_GATEWAY_API_KEY`, `COACH_MODEL`, `LANGFUSE_*`, `UPSTASH_*`, `GOOGLE_*`, `WITHINGS_*`, `STRAVA_*`, `MYFITNESSPAL_*`, `APPLE_TEAM_ID`, `SHARPIT_DEFAULT_*`, `FEATURE_ENGINE_ENABLED`, `ADMIN_EMAILS`. Stays: Clerk keys, `NEXT_PUBLIC_*`.
- ADR-048: phase 3 done; `HOSTS_INVENTORY.md`, `HOST_SPLIT_RUNBOOK.md`, README updated.

---

## 4. Your actions

| When     | Action                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| After 3b | Add `https://api.sharpit.app/api/<provider>/callback` as redirect URI in Strava, Withings, Google Cloud, MyFitnessPal consoles |
| 3d       | App Store Connect → App Store Server Notifications URL → `https://api.sharpit.app/api/billing/apple/notifications`             |
| 3e       | Test web + iOS after the switch                                                                                                |

## 5. Risks

- **OAuth redirect URIs:** add the new URI before removing the old one; providers accept several.
- **CORS on the apex** (decision 3): widened only for `https://sharpit.app`, removed in phase 4.
- **Latency:** one extra hop for the web only; measured in 3e, escape hatch documented.
- **Size:** 3a–3c touch ~200 files, mostly mechanical; each step deploys on its own and the switch (3e) is reversible.

## 6. As shipped (2026-09-26) and what 3f still needs

- **3a/3b shipped:** `api.` serves every `/api/*` handler; provider callbacks and App Store notifications are
  its only Bearer-less paths (`isSelfAuthenticatedPath`). Connects carry a signed state
  (`lib/integrations/oauth-state.ts`, `lib/signed-token.ts`); no handler reachable from `api.` writes a cookie
  (contract follows helpers transitively). Demo exit stays web-only.
- **3c shipped (client side):** `client/query/api-fetch.ts` + `ConnectLink` / `navigateToConnect`. Server
  components still read the database directly — harmless while the web has it, but they block 3f.
- **3d shipped:** migrations run in the `sharpit-api` build; one-owner contract.
- **CI fix found on the way:** `sharpit-api`'s ignore step diffed only `HEAD^`; the shared
  `scripts/ci/vercel-ignore-build.mjs --scope …` now covers every pushed commit.

**Blocking 3f — the anonymous demo.** `/demo` gives a visitor a cookie, no Clerk session; every demo read goes
to the web's own routes and database. `api.` is Bearer-only. Options: (a) a shared Clerk demo user signed in
through a sign-in token (like the Garmin handoff), writes refused server-side for that athlete; (b) keep a
read-only demo database role on the web; (c) drop the web demo. Recommended: (a). Until decided, demo
visitors keep the same-origin path (`apiFetch` falls back without a Clerk session).

**Also for 3f:** the 10 server-rendered pages, `/start`, `/demo`, `/connect/garmin/start` and 9 components
that reach `@sharpit/db` move to `api.` calls (server-side `auth().getToken()`), then the web routes and the
web's database variables go.

## 7. Done (2026-09-26)

- **3e:** `NEXT_PUBLIC_API_ORIGIN=https://api.sharpit.app` on `sharpit-webapp`; redirect URIs moved (Withings, Google),
  App Store notifications on `api.`.
- **Demo:** a shared read-only Clerk account ([ADR-049](../adr/ADR-049-demo-is-a-shared-clerk-account.md)).
- **3f:** every web page reads through `api.` (`/api/web/*` payloads, `apps/web/src/server/api-client.ts`); the web's
  117 `/api` mounts, `@sharpit/db`, its AI telemetry and rate limit are gone; database scripts live in `apps/api`.
  Contracts: the web serves no `/api` route, reaches no database module, depends on no `@sharpit/db`, and has no
  unreachable file.
- **Clean-up:** legacy URLs are `next.config` redirects; 57 dead web files and 24 dead server modules deleted; each
  Vercel project rebuilds only for its app, the packages and the root manifests.
- **Left to the owner:** removing the server variables from `sharpit-webapp` (writing to the secret store is theirs):
  `AI_GATEWAY_API_KEY COACH_MODEL DATABASE_URL DIRECT_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET LANGFUSE_BASE_URL
LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY NEXT_PUBLIC_APP_URL SECRET_ENCRYPTION_KEY UPSTASH_REDIS_REST_TOKEN
UPSTASH_REDIS_REST_URL WITHINGS_CLIENT_ID WITHINGS_CLIENT_SECRET WITHINGS_REDIRECT_URI`. `FEATURE_ENGINE_ENABLED`
  and `SHARPIT_DEFAULT_LATITUDE/LONGITUDE` are read by the server but missing on `sharpit-api`: copy them there first
  if their values matter, then remove them from the web. The web keeps Clerk, `NEXT_PUBLIC_API_ORIGIN`,
  `APPLE_TEAM_ID`, `ADMIN_EMAILS`.
