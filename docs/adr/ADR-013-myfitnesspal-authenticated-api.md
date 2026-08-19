# ADR-013: MyFitnessPal Integration via Authenticated JSON API Instead of Public Diary Scraping

**Status:** Accepted
**Date:** 2026-08-19
**Author:** Augustin Briolon
**Supersedes:** N/A

---

## Context

The MyFitnessPal integration imported nutrition into `DailyNutrition` by launching headless Chrome (`puppeteer-core`) against MFP's **public** diary page (`myfitnesspal.com/food/diary/<username>?key=<diaryKey>`) and parsing the HTML with `cheerio`. Connection only required a username and an optional public "share key" — no login.

This broke permanently. Verified directly against production MFP:

- `curl` on the public diary page → `403`.
- The project's own `scrapeDiary()`, run with a real headless Chrome instance and a real browser user agent → `403` (Cloudflare).

This is not rate-limiting; MFP now blocks unauthenticated diary-page fetches outright. `MyFitnessPalAccount` was also empty in every environment — the old flow had never been successfully connected in practice, so no user-facing regression existed to preserve, only a broken feature to fix.

A sibling project by the same author (`myfitnesspal-cli`) reads MFP's internal authenticated JSON API using a `__Secure-next-auth.session-token` cookie (the same cookie MFP's own web app uses) and works today. Verified live: a real diary read for 2026-08-19 returned structured entries with an exact `nutritional_contents` shape (`energy.value`, `protein`, `carbohydrates`, `fat`, `sugar`, `fiber`).

**Credentials-login was tried first and abandoned.** That CLI also implements `loginWithCredentials(email, password)` — a CSRF-then-credentials-callback login against MFP's own next-auth endpoint. `GET /api/auth/csrf` returns `200` by plain `fetch` (not behind the Cloudflare block that stops the diary-page scrape), which looked promising enough to build the whole email+password flow on: `loginMfp`, an `email`/`passwordEnc` schema mirroring Renpho, and MFP added to the auto-sync cron so a fresh cookie could be minted on every run with zero user involvement. Reproducing the actual login `POST` against production MFP (not just the CSRF `GET`) surfaced the real blocker: `POST /api/auth/callback/credentials` returns `{"url":".../api/auth/error?error=RecaptchaFailed"}` unconditionally for a plain server-to-server request — MFP gates this endpoint behind a reCAPTCHA challenge that only a real browser can solve. This is not account-specific and not a wrong password; it kills automated login entirely, for any account. The email+password code, schema, and cron wiring were reverted before commit; only the cron wiring survives (see Decision).

The codebase already has an established pattern for storing a bearer-style secret credential and signaling its expiry: Renpho's `passwordEnc` (encrypted via `src/lib/secret-box.ts`, AES-256-GCM) plus `ProviderAuthError` / `isProviderAuthFailure` in `src/lib/integrations/connection-status.ts`, used by `renpho-sync.ts` and `withings-sync.ts` to turn an expired credential into a visible "reconnect" state instead of a silent failure. MFP was also missing from the auto-sync cron (`src/app/api/cron/sync/route.ts`) entirely — it only synced on a manual button click, unlike every other connected provider.

---

## Decision

Replace the scraping-based client with a fetch-based client against MFP's authenticated JSON API (`src/lib/integrations/myfitnesspal.ts`):

1. The connection credential is the user's own `__Secure-next-auth.session-token` cookie, pasted manually into Settings → Integrations (there is no automatable login for this internal API — see Context).
2. `MyFitnessPalAccount.sessionTokenEnc` stores the cookie encrypted with the existing `secret-box` mechanism (same as Renpho's password) — replacing the previous `userId` (username) / `accessToken` (public diary key) / `refreshToken` / `expiresAt` fields, which were an abused OAuth-shaped schema for a login flow that was never OAuth.
3. Diary reads hit `GET /api/services/diary/read_diary` and `GET /api/services/diary/read_day` directly; `puppeteer-core` and `cheerio` are dropped from the project entirely.
4. On a `401`/`403` response, `MfpSessionExpiredError` is thrown, the stored cookie is revoked (`sessionTokenEnc: ''`), and `syncMfpNutrition` re-throws it as `ProviderAuthError` — the same pattern Renpho/Withings already use — so an expired session now surfaces as a real reconnect prompt instead of being silently swallowed.
5. MFP is added to the auto-sync cron (`src/app/api/cron/sync/route.ts`), mirroring the Renpho/Withings branch exactly: sync runs automatically on the existing schedule as long as the stored cookie is still valid, isolated so an MFP failure doesn't block other providers. This part of the abandoned credentials-login attempt is kept — the cron doesn't care how the session was obtained, only that a valid one is stored.
6. Everything downstream of `MfpDayResult` (the sync upsert into `DailyNutrition`, the nutrition presentation layer, the nutrition UI, the AI coach context) is unchanged: the client produces the same `MfpDayResult` / `MfpScrapedMeal` shape the old scraper did, just sourced from JSON instead of parsed HTML.

---

## Rationale

The authenticated API is strictly better on every axis that matters here: it is not blocked by Cloudflare, it returns structured per-nutrient data instead of text scraped from HTML table cells (eliminating a class of parsing bugs), and it reuses code already proven to work against production MFP today (`myfitnesspal-cli`).

Automated login was the more attractive option and was pursued first, but MFP's reCAPTCHA gate on the credentials-callback endpoint rules it out — not as a theoretical risk, but as an observed, unconditional failure. A manually pasted cookie is the ceiling of what's achievable without a real browser in the loop (or a CAPTCHA-solving service, which is out of scope on both reliability and ethics grounds). The cookie is a real bearer secret for the user's own MFP account (not a scoped, revocable share key), so it must be encrypted at rest — which the codebase already knows how to do for exactly this situation (Renpho). No new mechanism was invented for either the encryption or the auth-failure signaling; both are the codebase's own existing convention, applied to a fourth provider.

## Alternatives Considered

### Alternative 1: Keep scraping, work around Cloudflare (e.g. `puppeteer-extra-plugin-stealth`, residential proxy, retry/backoff)

**Description:** Add anti-detection tooling or proxying to the existing headless-Chrome scraper.

**Pros:**

- No schema or credential-flow change

**Cons:**

- Adversarial and brittle: Cloudflare fingerprinting evolves, so this would need ongoing maintenance with no upstream contract
- Still scrapes HTML markup MFP can change at any time, unlike a versioned JSON API
- A working authenticated alternative already exists and is proven

**Rejected because:** fixing a scraper against active bot-detection is fighting the wrong battle when a stable authenticated API is available and already validated.

### Alternative 2: Email + password, auto-relogin on demand (`loginMfp`)

**Description:** Store `email` + encrypted `passwordEnc` (mirroring `RenphoAccount`); call `loginMfp(email, password)` — the CSRF-then-credentials-callback flow ported from `myfitnesspal-cli` — at the start of every sync to mint a fresh session cookie, removing the cookie-expiry problem entirely.

**Pros:**

- No recurring manual step at all: the password doesn't expire the way the cookie does
- Matches the codebase's established Renpho pattern exactly (encrypted credential, on-demand login, `ProviderAuthError` on failure)

**Cons:**

- `POST /api/auth/callback/credentials` returns `error=RecaptchaFailed` for every plain server-to-server request — verified directly against production MFP, not account- or password-specific. Automated login is not possible without a real browser solving the challenge
- Storing the account password is a larger blast radius on leak than a scoped session cookie

**Rejected because:** it doesn't work. This was built, then disproven by directly reproducing the login request and reading MFP's actual response, not by inference from the CSRF endpoint being reachable.

### Alternative 3: Full OAuth-style integration (client id/secret, refresh tokens) like Strava/Withings/Google

**Description:** Mirror the OAuth integrations' schema and flow exactly, including token refresh.

**Pros:**

- Consistent `accessToken`/`refreshToken`/`expiresAt` shape across all providers
- Automatic refresh, no manual reconnect

**Cons:**

- MFP's internal API has no public OAuth app registration for third parties; there is nothing to register a client id/secret against
- Would require reverse-engineering MFP's own web login flow to mint refresh tokens, which is a materially larger and more fragile undertaking than reading an already-authenticated session cookie

**Rejected because:** there is no real OAuth surface to integrate against; forcing the OAuth shape here would recreate the exact "abused schema" problem this ADR is fixing, just with different lies in the field names.

---

## Consequences

### Positive

- MFP nutrition sync works again, sourced from a stable authenticated API instead of a scraper permanently blocked by Cloudflare
- MFP now syncs automatically on the existing cron schedule, matching every other connected provider, instead of requiring a manual button click — this survives even though the credentials-login attempt that motivated it didn't
- Credential storage and auth-failure signaling now follow the same encrypted-at-rest + `ProviderAuthError` convention as Renpho/Withings, instead of MFP being the one provider with neither
- `puppeteer-core` and `cheerio` are removed from the dependency tree (confirmed unused elsewhere in the codebase)
- Richer, more reliable per-nutrient data (direct numeric fields) replaces regex-cleaned scraped text

### Negative

- The session cookie has no refresh mechanism and expires after roughly 30 days (per `myfitnesspal-cli`'s own documented behavior); the user must manually copy a fresh cookie from browser DevTools into Settings → Integrations when it expires. Once expired, cron sync fails silently (isolated into `result.errors`) until the user notices and reconnects
- The stored credential is now a bearer secret for the user's real MFP account rather than a scoped, revocable share key — a leaked cookie grants broader access than the old public diary key did. Mitigated by encryption at rest via `secret-box`, but the encryption key itself is derived from `CRON_SECRET`/`DATABASE_URL`, not a dedicated secret
- `complete` (day-completion flag) is now derived from `GET /api/services/diary/read_day`'s `status` field, observed as `null` on an incomplete day; behavior when `status` holds a real "complete" value has not been observed against a genuinely completed diary day

### Scientific debt created

- N/A — this is a data-plumbing change, not a scientific/estimation decision

---

## Review Criteria

Revisit if:

- MFP ships a public OAuth app registration for third-party diary access, which would let this move to the same refreshable-token pattern as Strava/Withings/Google and remove the manual-reconnect burden
- MFP's credentials-callback login is observed to stop requiring reCAPTCHA for server-to-server requests (unlikely, but cheap to re-check), which would reopen Alternative 2 (email + password, auto-relogin)
- The `read_day` `status` field is observed to encode something other than a simple presence/absence of completion (e.g. multiple non-null non-complete states), which would require revisiting the `complete = Boolean(status)` mapping in `buildDayResult`
