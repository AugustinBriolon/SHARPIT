# ADR-014: Keep the MyFitnessPal Session Alive by Rolling next-auth's Cookie Forward on Every Sync

**Status:** Accepted
**Date:** 2026-08-19
**Author:** Augustin Briolon
**Supersedes:** N/A (amends the "session expires after ~30 days" consequence of [ADR-013](./ADR-013-myfitnesspal-authenticated-api.md))

---

## Context

[ADR-013](./ADR-013-myfitnesspal-authenticated-api.md) established the MyFitnessPal integration on a manually pasted `__Secure-next-auth.session-token` cookie, and accepted one explicit negative consequence:

> The session cookie has no refresh mechanism and expires after roughly 30 days […] the user must manually copy a fresh cookie from browser DevTools into Settings → Integrations when it expires. Once expired, cron sync fails silently […] until the user notices and reconnects.

That consequence is the whole cost of the integration. The connection ritual — open MFP, open DevTools, Application → Cookies, find one specific HttpOnly cookie, copy a ~1.4 KB opaque value — is unacceptable UX to repeat monthly, and the failure mode in between is silent.

The premise behind "no refresh mechanism" turned out to be wrong. MFP's web app runs **next-auth**, and next-auth's session endpoint re-issues its JWT cookie when a session is older than `updateAge`. Three facts were verified directly against production MFP:

- `GET https://www.myfitnesspal.com/api/auth/session` answers `200` to a plain server-to-server request — it is **not** behind the Cloudflare block that killed the old diary-page scrape, and not behind the reCAPTCHA gate that killed automated credentials login (ADR-013, Alternative 2).
- Unauthenticated, it answers `200` with a body of `{}` — so the status code is not an expiry signal, but the absence of `user` in the body is.
- Authenticated with the stored cookie, it answers `200` **and returns a new `Set-Cookie` for `__Secure-next-auth.session-token`** whose value differs from the one sent. Confirmed end-to-end: a real `syncMfpNutrition` run rotated and persisted the stored credential (`stored credential changed: true`).

Because MFP's session is a stateless JWT, rotation does not invalidate the previous token, so a failed persist is not destructive.

## Decision

Touch the next-auth session endpoint once at the start of every sync and persist the token MFP hands back.

1. `refreshMfpSession(session)` in `src/lib/integrations/myfitnesspal.ts` calls `GET /api/auth/session` and returns `{ sessionToken, rotated }`. A response body without `user` throws `MfpSessionExpiredError` — the existing expiry signal, now raised from a cheaper and more reliable check than a `401`/`403` on a diary read.
2. `parseRotatedSessionToken(setCookieHeaders)` is a separate pure function so the header parsing is unit-tested without network access. Chunked next-auth cookies (`…session-token.0`, `.1`) are deliberately ignored: the stored credential is a single-value cookie, and persisting half a token would break a connection that currently works.
3. `syncMfpNutrition` calls `rollSessionForward` before its day loop, writes `sessionTokenEnc` only when `rotated` is true, and uses the returned token for the rest of the run.
4. A refresh **failure** that is not an expiry is logged and swallowed: the sync continues with the stored cookie. Keeping the session alive is an optimisation; it must never take down a sync the existing credential can still serve.
5. Expiry handling is unchanged — `MfpSessionExpiredError` still revokes the credential and surfaces as `ProviderAuthError`, the same convention as Renpho and Withings.

## Rationale

As long as a sync runs at least once inside next-auth's window — and the cron runs daily — the expiry is pushed forward on every run and the manual re-paste never comes due. The remaining manual step is the _first_ connection, and any real logout on MFP's side. That converts the integration's headline cost from "recurring monthly chore with a silent failure mode" to "one-time setup".

The mechanism is MFP's own session-renewal behaviour used exactly as its web app uses it — not an anti-detection workaround, not a scraper, and not the reCAPTCHA-gated login path ADR-013 ruled out. Nothing new was introduced to the codebase: the credential is stored through the existing `secret-box` encryption, and expiry surfaces through the existing `ProviderAuthError` path.

## Alternatives Considered

### Alternative 1: Capture `Set-Cookie` on every MFP request instead of one dedicated call

**Description:** Rotate opportunistically inside `mfpGet`, from whatever any diary endpoint happens to return.

**Pros:**

- No extra request per sync

**Cons:**

- next-auth re-issues its cookie from the session route, not from arbitrary application endpoints — so this would mostly capture nothing, unpredictably
- Couples every read path to credential persistence, making `mfpGet` a function that both fetches and writes to the database

**Rejected because:** one explicit call with a single responsibility is cheaper to reason about than rotation scattered across every request, for the cost of one HTTP round trip per sync.

### Alternative 2: Browser extension or local script to re-extract the cookie faster

**Description:** Read the HttpOnly cookie via `chrome.cookies` (extension) or from the local Chrome profile (script), and POST it to the connect endpoint.

**Pros:**

- Also removes the DevTools ritual, and works for the _first_ connection too

**Cons:**

- Reduces the friction of a recurring chore instead of removing the chore
- An extension needs distribution and maintenance; a local-profile reader is macOS/Chrome-specific and breaks whenever Chrome changes its cookie encryption

**Rejected because:** rotation removes the recurrence entirely, which is the actual problem. These remain viable for first-connect UX and are not foreclosed by this decision.

### Alternative 3: Migrate to MFP's mobile identity API (`identity-api.myfitnesspal.com`) with a real `refresh_token`

**Description:** Log in with email + password against the mobile OAuth flow and store a refresh token, removing the cookie entirely.

**Pros:**

- Removes the manual step even for the first connection
- A real OAuth refresh token is a sturdier contract than a rolled session cookie

**Cons:**

- Requires storing the account password, a larger blast radius than a session cookie
- The mobile diary endpoints differ from the web ones and would need re-mapping to `MfpDayResult`

**The login itself works.** Verified end-to-end against production: `POST /oauth/authorize` with a `HS512`-signed `{username, password}` JWT returns `302` to `mfp://identity/callback?code=…`, the code exchanges for an `access_token` (900 s) **plus a `refresh_token`**, and the refresh grant returns a fresh pair. There is no reCAPTCHA on this path — the gate that killed ADR-013's Alternative 2 exists only on the _web_ next-auth endpoint. So the premise "there is no automatable MFP login" is false in general; it is only true for the web API.

**But the mobile API is a worse data source, and its token is worthless on the web API:**

- `GET /v2/diary?entry_date=…&fields[]=all` returns meals **already aggregated** (`type: "diary_meal"`), with no individual food entries. `types[]=food_entry` is rejected with `Unrecognized diary entry type(s)`, and no `/v2/food_entries`-style endpoint exists. The web API's `food_entry` rows, which carry `food.description`, have no mobile equivalent — and the nutrition UI expands meals into their individual foods.
- No day-completion flag exists anywhere in the mobile response; `complete` currently comes from the web `read_day` `status` field.
- No multi-day query works (`entry_date[]`, `entry_dates[]`, `min_entry_date`/`max_entry_date`, and a `..` range were all tried: each returns the current day only), so it would not even reduce the per-day request loop.
- The mobile bearer token does **not** authenticate the web API. `GET /api/services/users` answers the identical `400 Missing HTTP header: Authorization` with the bearer, without it, with `mfp-user-id` added, and with the raw token — the web service ignores it entirely. A hybrid of "mobile login for auth, web endpoints for richer data" is therefore not available.

**Rejected because:** the migration would trade a working credential for a strictly poorer diary — losing per-food entries and the completion flag — in exchange for removing a one-time setup step that rotation has already made one-time. Not deferred: disproven on the merits.

---

## Consequences

### Positive

- The ~30-day manual cookie re-paste no longer comes due while the cron keeps running — the integration's main documented cost is removed
- Expiry is now detected by an explicit, cheap check at the start of a sync rather than as a side effect of a diary read failing partway through the loop
- The rotation parser is pure and unit-tested, so header-shape regressions are caught without network access

### Negative

- One extra HTTP request per sync
- The guarantee depends on MFP's next-auth configuration continuing to roll sessions; if MFP disables rotation, the integration silently reverts to ADR-013's manual re-paste with no explicit signal that it has done so
- If a sync never runs for longer than the session's lifetime (cron disabled, project idle), the cookie still expires — rotation extends the window, it does not make the credential permanent
- The first connection still requires the DevTools copy ritual

### Scientific debt created

- N/A — credential-plumbing change, no scientific or estimation decision

---

## Review Criteria

Revisit if:

- MFP's mobile API starts exposing individual food entries and a day-completion flag, which is the only thing that makes Alternative 3 worth revisiting — its login already works
- Syncs begin failing with `ProviderAuthError` on a schedule that suggests MFP stopped rotating sessions, meaning rotation silently stopped working
- MFP starts issuing chunked session cookies (`…session-token.0`), which `parseRotatedSessionToken` deliberately ignores today and which would silently disable rotation

---

## Note: the web diary endpoints need no authentication at all for a public diary

While probing alternatives, `GET /api/services/diary/read_diary?username=<username>&entry_date=…` was observed returning a full diary — **with no cookie and no token of any kind**. `read_day` behaves the same. This is MFP's own behaviour for an account whose diary sharing is set to public, and it means the account's food log is readable by anyone who knows the username.

This is deliberately **not** used as the integration's read path, even though it would remove the credential entirely. Doing so would silently couple a working feature to a privacy setting the athlete should be free to change: the day the diary is made private, sync would break with no obvious cause. The cookie stays the credential, and the integration keeps working either way.
