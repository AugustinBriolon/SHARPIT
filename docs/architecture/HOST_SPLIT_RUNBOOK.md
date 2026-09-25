# Host split runbook — `api.` · `web.` · apex

**Status:** in progress · **Last update:** 2026-09-25
**Inventory:** [HOSTS_INVENTORY.md](./HOSTS_INVENTORY.md) · **Garmin:** [ADR-047](../adr/ADR-047-garmin-connects-in-an-in-app-authentication-session.md)

Each step ends with a check that must pass before the next one starts. Nothing here pastes a secret:
Bearer tokens for the smokes come from `SHARPIT_SMOKE_BEARER` in the environment only.

| Step                                   | State                                                             | Where                                                                              |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1. Private Must green                  | ⚠️ Today ✅ · Garmin in-app session shipped, awaiting device test | ADR-047                                                                            |
| 2. Inventory                           | ✅                                                                | `HOSTS_INVENTORY.md`                                                               |
| 3. Apex safety net                     | ✅ live                                                           | `src/proxy.test.ts`, `yarn smoke:must-private` (apex + web. all `PASS` 2026-09-25) |
| 4. Prepare `api.`                      | ✅ live                                                           | `src/lib/hosts/api-host.ts`, `yarn smoke:api-host` (5/5 `PASS` 2026-09-25)         |
| 5. Web calls `api.`                    | ⏸ deferred to step 7                                              | below                                                                              |
| 6. iOS origin → `api.`                 | ✅ merged (SHARPIT-APP `18ef55c`), awaiting device smoke          | `Config/Release.xcconfig`; web pages on `SHARPIT_WEB_ORIGIN`                       |
| 7. Detach `api.` project               | ⏸ owner (Vercel)                                                  | below                                                                              |
| 8. Apex hub                            | ⏸ needs product copy                                              | below                                                                              |
| 9. Thin web                            | ⏸ needs team UX validation                                        | below                                                                              |
| 10. Stripe web · IAP · Pro entitlement | later                                                             | ADR-044                                                                            |

---

## Step 1 — close the private Must (owner)

1. **Deploy `main`**, which ships `POST /api/v1/garmin/handoff`.
2. On the iPhone, Paramètres → Sources de données → Garmin: a sheet opens on `sharpit.app` already signed
   in, Garmin's page asks for the Garmin password, the sheet closes by itself on
   `/connect/garmin/callback` and the row reads « Connecté » (ADR-047).
3. `yarn smoke:must-private https://sharpit.app https://web.sharpit.app` with a fresh Bearer → all `PASS`.

## Step 4 — ship the `api.` guards (done 2026-09-25)

Shipped with `main` at `78e693da`; `yarn smoke:api-host` passes against production.

1. `NEXT_PUBLIC_APP_URL` is `https://web.sharpit.app` in Production: links handed to iOS open the thin
   web, never `api.`.
2. Merge `feat/api-host-guards`, deploy.
3. `yarn smoke:api-host` → all `PASS` (with `SHARPIT_SMOKE_BEARER` for the last check).
4. `yarn smoke:must-private https://sharpit.app https://web.sharpit.app` → still all `PASS`.
5. Clerk dashboard: allowed origins = `https://sharpit.app`, `https://web.sharpit.app`; **not** `api.`.

What the guards do, only when the host is `api.sharpit.app` (`src/lib/hosts/api-host.ts`):
`/api/v1/*` and `/api/coach/chat` only, everything else `404` JSON; no Bearer or a rejected one → `401`
JSON; `Set-Cookie` stripped; `Cache-Control: private, no-store`; CORS `https://web.sharpit.app` only,
any other `Access-Control-Allow-Origin` removed; the existing per-athlete rate limit (Upstash).

Known limits: a route handler's own `Set-Cookie` cannot be removed by the proxy — a test forbids any
`/api/v1` route or the coach stream from setting one. Vercel cron calls the production domain, never `api.`.

## Step 6 — iOS origin → `api.`

Prerequisite: step 4 green on production.

Already on SHARPIT-APP `main`: web pages (terms, privacy) open on `SHARPIT_WEB_ORIGIN` (apex), never on the
API origin, and universal links are honoured on `https://sharpit.app` only (`IncomingLink`).

1. Merged on SHARPIT-APP `main` (`18ef55c`: `Config/Release.xcconfig` only; Associated Domains untouched).
2. In your gitignored `Config/Local.xcconfig`: `SHARPIT_API_ORIGIN = https:/$()/api.sharpit.app` and
   `SHARPIT_WEB_ORIGIN = https:/$()/sharpit.app`.
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
