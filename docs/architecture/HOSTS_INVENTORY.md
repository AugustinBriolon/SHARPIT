# Hosts inventory — before the `api.` / `web.` / apex split

**Snapshot:** 2026-09-25 · step 2 of the host split plan · names only, never values.
**Sources:** `vercel project inspect`, `vercel env ls` (values hidden by Vercel), `vercel alias ls`,
public HTML of each host, `curl` of each route, both repositories.

Re-run `yarn smoke:must-private https://sharpit.app https://web.sharpit.app` after any change below.

---

## 1. Blocking findings

| #   | Finding                                                                                                                                                                       | Impact                                                                                                 | Owner action                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | One Vercel project (`sharpit`) serves `sharpit.app`, `www.sharpit.app`, `web.sharpit.app` and `api.sharpit.app` from the same deployment and the same env.                    | `api.` already serves HTML (`/` → `/welcome`, `/sign-in`, `/connect/*`, AASA) with every secret below. | Steps 4 and 7.                             |
| 2   | Every response carries `access-control-allow-origin: *` (Vercel default, not set by the app).                                                                                 | Violates "CORS allowlist `https://web.sharpit.app` only" once `api.` is live.                          | Step 4: explicit CORS on `api.` responses. |
| 3   | `/api/v1/*` without a Bearer, or with an invalid one, answers `404 text/html` (`auth.protect()` rewrite), Clerk header `x-clerk-auth-reason: protect-rewrite, token-invalid`. | Target is `401` JSON.                                                                                  | Step 4.                                    |
| 4   | `APPLE_APP_APPLE_ID` is **not set**.                                                                                                                                          | `src/lib/billing/apple-verifier.ts` throws for Production StoreKit verification (Pro, ADR-044).        | Set it before shipping Pro.                |

---

## 2. Hosts

All four aliases point at the production deployment of project `sharpit` (`augustin-briolons-projects`).
`sharpit.vercel.app` redirects to `https://sharpit.app` (`next.config.ts`).

| Route                                     | `sharpit.app`                            | `web.sharpit.app` | `api.sharpit.app` | Target                                   |
| ----------------------------------------- | ---------------------------------------- | ----------------- | ----------------- | ---------------------------------------- |
| `/.well-known/apple-app-site-association` | 200 JSON, no redirect, real Team ID      | same              | same              | apex only                                |
| `/connect/garmin` (document)              | 307 → `/sign-in?redirect_url=` same host | same              | same              | apex (+ web.)                            |
| `/connect/garmin/callback`                | 200 HTML                                 | same              | same              | apex                                     |
| `/`                                       | 307 → `/welcome`                         | same              | same              | apex: landing · web.: Today · api.: none |
| `/api/v1/today` no Bearer                 | 404 HTML                                 | same              | same              | api.: 401 JSON                           |
| Clerk publishable key                     | `pk_live_`                               | `pk_live_`        | `pk_live_`        | one instance                             |

---

## 3. Clerk

- One production instance, Frontend API `clerk.sharpit.app` (primary domain `sharpit.app`, not a satellite —
  `src/lib/auth/clerk-config.ts`).
- Web (Vercel) uses a `pk_live_` publishable key; iOS hardcodes the same `pk_live_` key in
  `SHARPIT-APP/Networking/APIConfiguration.swift` → same instance. ✅
- `CLERK_SECRET_KEY` prefix cannot be read from the CLI (hidden). A `pk`/`sk` mismatch is logged at boot as
  `[auth] Clerk configuration … instance_mismatch`; none reported by the smoke (`/sign-in` renders).
- Local `.env`: `pk_test_` + `sk_test_` (development instance, consistent).
- **Not inventoried (dashboard only):** allowed origins, redirect URLs, native application registration.
  To check in the Clerk dashboard: allowed origins contain `https://sharpit.app` and `https://web.sharpit.app`,
  **not** `https://api.sharpit.app` (Bearer only, no browser session there).

---

## 4. Environment variables (Vercel project `sharpit`)

| Name                                                                                   | Environments        | Class           | Used by                 |
| -------------------------------------------------------------------------------------- | ------------------- | --------------- | ----------------------- |
| `CLERK_SECRET_KEY`                                                                     | Production, Preview | secret          | auth everywhere         |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                                                    | Production, Preview | public          | web UI                  |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                       | Production, Preview | public          | web UI                  |
| `CRON_SECRET`                                                                          | Production, Preview | secret          | `/api/cron/*`           |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID`, `APNS_PRODUCTION` | Production          | secret (`.p8`)  | morning push            |
| `APPLE_TEAM_ID`                                                                        | Production          | public-ish      | AASA                    |
| `DATABASE_URL`, `DIRECT_URL`                                                           | Production, Preview | secret          | Prisma                  |
| `SECRET_ENCRYPTION_KEY`                                                                | Production, Preview | secret          | provider tokens at rest |
| `AI_GATEWAY_API_KEY`, `COACH_MODEL`                                                    | Production, Preview | secret / config | coach                   |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                             | Production, Preview | secret          | Google integration      |
| `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`, `WITHINGS_REDIRECT_URI`                | Production, Preview | secret          | Withings                |
| `ADMIN_EMAILS`                                                                         | Production          | PII             | admin gate              |
| `FEATURE_ENGINE_ENABLED`, `SHARPIT_DEFAULT_LATITUDE`, `SHARPIT_DEFAULT_LONGITUDE`      | Production, Preview | config          | —                       |

**Also set in Production:** `NEXT_PUBLIC_APP_URL` (`https://web.sharpit.app`: absolute links handed to iOS
open the thin web), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LANGFUSE_BASE_URL`,
`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`.
**Missing vs `.env.example`:** `APPLE_APP_APPLE_ID`, `APPLE_IAP_BUNDLE_ID` (has a default), `STRAVA_*`
(Strava off), `GOOGLE_REDIRECT_URI`.
**Must never be set in production:** `DEV_BYPASS_CLERK`, `NEXT_PUBLIC_DEV_BYPASS_CLERK`, `DEV_TOOLS_ENABLED` — absent ✅.

### Who holds what today

Every secret above (`sk_*`, APNs `.p8`, `CRON_SECRET`, database, encryption key) is readable by the single
deployment that also serves the public HTML of all four hosts. Step 7 splits it:

| Future project                                  | Needs                                                                                              | Must not have                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `api.` (JSON + Bearer)                          | `CLERK_SECRET_KEY`, database, `SECRET_ENCRYPTION_KEY`, AI, providers, Upstash, APNs, `CRON_SECRET` | HTML, cookies                 |
| `web.` (thin UI)                                | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (server-side token for `api.`)             | APNs, `CRON_SECRET`, database |
| apex hub (AASA, `/connect/*`, landing, `/docs`) | `APPLE_TEAM_ID`; Clerk + Garmin SSO state for `/connect/garmin`                                    | APNs, `CRON_SECRET`, AI keys  |

---

## 5. iOS (SHARPIT-APP)

| Item                           | Value                                                                                                                                                                      | Where                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| API origin                     | Release `https://sharpit.app` · Debug `http://127.0.0.1:3000` · Local (gitignored) per machine                                                                             | `Config/*.xcconfig` → `Info-Extra.plist` `SharpitAPIOrigin` |
| Associated Domains             | `applinks:sharpit.app`, `webcredentials:sharpit.app`                                                                                                                       | `SHARPIT.entitlements`                                      |
| Garmin connect                 | in-app `WebAuthenticationSession` on the apex, entry from `POST /api/v1/garmin/handoff` ([ADR-047](../adr/ADR-047-garmin-connects-in-an-in-app-authentication-session.md)) | `Features/Connections/GarminConnect.swift`                  |
| Garmin callback universal link | `/connect/garmin/callback` (path-only check, host not checked)                                                                                                             | `App/RootView.swift`                                        |
| Coach chat (SSE)               | `/api/coach/chat` (stays off `/api/v1`)                                                                                                                                    | `Networking/CoachChatClient.swift`                          |
| Secrets in the binary          | none (`pk_live_` is public; no `sk_`, no Stripe Checkout)                                                                                                                  | —                                                           |
