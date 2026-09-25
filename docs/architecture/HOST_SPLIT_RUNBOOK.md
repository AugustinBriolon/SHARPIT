# Host split runbook — `api.` · `web.` · apex

**Status:** in progress · **Last update:** 2026-09-25
**Inventory:** [HOSTS_INVENTORY.md](./HOSTS_INVENTORY.md) · **Garmin:** [ADR-046](../adr/ADR-046-garmin-connects-in-app-with-native-credentials.md)

Each step ends with a check that must pass before the next one starts. Nothing here pastes a secret:
Bearer tokens for the smokes come from `SHARPIT_SMOKE_BEARER` in the environment only.

| Step                                   | State                                                                 | Where                                                                             |
| -------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1. Private Must green                  | ⚠️ Today ✅ · Garmin in-app ❌ (DI ticket rejected) · Upstash missing | —                                                                                 |
| 2. Inventory                           | ✅                                                                    | `HOSTS_INVENTORY.md`                                                              |
| 3. Apex safety net                     | ✅ in code                                                            | `src/proxy.test.ts` (apex AASA and callback untouched), `yarn smoke:must-private` |
| 4. Prepare `api.`                      | ✅ in code, not deployed                                              | branch `feat/api-host-guards`, `yarn smoke:api-host`                              |
| 5. Web calls `api.`                    | ⏸ deferred to step 7                                                  | below                                                                             |
| 6. iOS origin → `api.`                 | ✅ in code, not merged                                                | SHARPIT-APP branch `feat/api-origin`                                              |
| 7. Detach `api.` project               | ⏸ owner (Vercel)                                                      | below                                                                             |
| 8. Apex hub                            | ⏸ needs product copy                                                  | below                                                                             |
| 9. Thin web                            | ⏸ needs team UX validation                                            | below                                                                             |
| 10. Stripe web · IAP · Pro entitlement | later                                                                 | ADR-044                                                                           |

---

## Step 1 — close the private Must (owner)

1. **Upstash** — create a Redis database, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   (Production), redeploy. Without it, `/api/v1/sync` and the coach answer `503`.
2. **Deploy `main`** (`git push`), which ships the Garmin diagnostics (`d7f7f0f2`).
3. On the iPhone, connect Garmin in-app once. If it fails, the app now shows `(code : …)`; the Vercel log
   line `[api/v1/garmin/connect] connection failed` lists every DI client id's rejection and the log line
   `[garmin] mobile login failed before the widget fallback` says why the primary path failed. Bring both.
4. `yarn smoke:must-private https://sharpit.app https://web.sharpit.app` with a fresh Bearer → all `PASS`.

## Step 4 — ship the `api.` guards

Prerequisite: step 1 green.

1. Set `NEXT_PUBLIC_APP_URL=https://sharpit.app` (Production) so links handed to iOS never name `api.`.
2. Merge `feat/api-host-guards`, deploy.
3. `yarn smoke:api-host` → all `PASS` (with `SHARPIT_SMOKE_BEARER` for the last check).
4. `yarn smoke:must-private https://sharpit.app https://web.sharpit.app` → still all `PASS`.
5. Clerk dashboard: allowed origins = `https://sharpit.app`, `https://web.sharpit.app`; **not** `api.`.

What the guards do, only when the host is `api.sharpit.app` (`src/lib/hosts/api-host.ts`):
`/api/v1/*` and `/api/coach/chat` only, everything else `404` JSON; no Bearer or a rejected one → `401`
JSON; `Set-Cookie` stripped; `Cache-Control: private, no-store`; CORS `https://web.sharpit.app` only,
any other `Access-Control-Allow-Origin` removed; the existing per-athlete rate limit (needs Upstash).

Known limits: a route handler's own `Set-Cookie` cannot be removed by the proxy — a test forbids any
`/api/v1` route or the coach stream from setting one. Vercel cron calls the production domain, never `api.`.

## Step 6 — iOS origin → `api.`

Prerequisite: step 4 green on production.

1. Merge SHARPIT-APP `feat/api-origin` (`Config/Release.xcconfig` only; Associated Domains untouched).
2. Set `SHARPIT_API_ORIGIN = https:/$()/api.sharpit.app` in your gitignored `Config/Local.xcconfig`.
3. Smoke on device: Today, pull-to-refresh sync, Garmin connect in-app, coach chat, morning push tap.

## Step 5 + 7 — detach `api.` and point the web at it (owner, Vercel)

Done together: while one deployment serves both hosts, the web calling `api.` over HTTP only adds a
network hop.

1. Create Vercel project `sharpit-api` from the same repository; move the `api.sharpit.app` domain to it.
   Env: everything the API needs (inventory §4, "`api.`" row); **no** public-page variables.
2. On the `sharpit` project remove `APNS_*` and `CRON_SECRET` once crons run on `sharpit-api`
   (move `vercel.json` crons with them).
3. Web server code calls `https://api.sharpit.app/api/v1/*` with `await auth().getToken()` as Bearer;
   Clerk cookies stay on `web.`. Start with Today (read-only).
4. `yarn smoke:api-host`, `yarn smoke:must-private …` → all `PASS`.

## Step 8 — apex hub (needs product copy)

`/` = athlete landing linking privacy (`/privacy`) and terms (`/terms`); `/docs` = curated playbook
(legal and product only, never `docs/archive` or `docs/audits`); no Connect/Today teaser. The proxy's
`/` → `/welcome` redirect for strangers becomes the landing. AASA and `/connect/*` stay untouched:
re-run `yarn smoke:must-private https://sharpit.app` and a universal-link tap after the change.

## Step 9 — thin web (needs team validation)

Remove the rich Coach and heavy editing from the web (iOS only); `/welcome` signed-out only.
Deviation already noticed: a signed-in athlete on `/welcome` goes to `/start`, not `/`
(`src/proxy.ts`, `redirectSignedIn`). Not changed until the team validates the UX.
