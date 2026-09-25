# ADR-046: iOS connects Garmin in-app with a native credentials form

**Status:** Proposed  
**Date:** 2026-09-25  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A — amends the iOS Garmin handoff described alongside [ADR-040](./ADR-040-ios-product-canonical-api-v1.md)

---

## Context

The native Garmin connection was a handoff: the iOS app opened `https://sharpit.app/connect/garmin` in Safari, the web ran Garmin's browser SSO (the password is typed on Garmin's own page), and the flow returned to the app through the universal link `/connect/garmin/callback*` declared in the apex AASA.

On 2026-09-25 the athlete journey was reviewed on device: leaving the app for Safari, possibly signing in to SharpIt again on the web, then coming back, breaks the "stay in the app" experience the product wants on iOS.

The server already exposes `POST /api/v1/garmin/connect` (Clerk Bearer, `{ username, password }`), which logs in to Garmin server-side (mobile SSO first, then the SSO embed widget as a fallback), exchanges the service ticket for DI OAuth2 tokens and stores only those tokens, encrypted. A native form using it was built in SHARPIT-APP (`GarminConnectSheet`) and is used by Connections and the onboarding sources step.

The host split under way (`api.sharpit.app` = JSON + Bearer only, `sharpit.app` = AASA and `/connect/*`, `web.sharpit.app` = thin UI) also matters: an HTML handoff can never live on `api.`.

---

## Decision

Connect Garmin from iOS in-app, through the native credentials form calling `POST /api/v1/garmin/connect` on `SHARPIT_API_ORIGIN` (the apex today, `https://api.sharpit.app` once the iOS origin switches). The web keeps `/connect/garmin` and its browser SSO for web athletes; the apex AASA and `/connect/garmin/callback*` stay in place, unchanged.

---

## Rationale

- The athlete never leaves the app and never has to sign in to the web.
- The endpoint already exists, is on the canonical `/api/v1` contract and is pure JSON + Bearer, so it moves to `api.` with every other native call — no universal link, no AASA dependency for this path.
- Only encrypted DI tokens are persisted; the password is used once for the login and dropped.

---

## Alternatives Considered

### Alternative 1: `ASWebAuthenticationSession` on `https://sharpit.app/connect/garmin`

**Description:** Open the existing web handoff in an in-app authentication sheet instead of Safari; the sheet closes on the callback.

**Pros:**

- The password is typed on Garmin's own page and never reaches SharpIt.
- Uses Garmin's browser SSO from the athlete's device and IP, the path least likely to be blocked by Garmin.
- No server change; the handoff already ends on a callback URL the session can watch.

**Cons:**

- A web page inside a sheet; the athlete may have to sign in to SharpIt again in it until a session-transfer token is added.
- Keeps an HTML dependency on the apex for a native flow.

**Rejected because:** the product decision favours a fully native form; kept as the fallback if server-side Garmin login proves unreliable (see Review Criteria).

### Alternative 2: Keep the Safari + universal link handoff

**Description:** Status quo — `Link` to `/connect/garmin`, return through `/connect/garmin/callback*`.

**Pros:**

- Already live and verified by `yarn smoke:must-private` (AASA, entry and callback on the apex).
- Password stays on Garmin's page.

**Cons:**

- Leaves the app; the return depends on the universal link being honoured.

**Rejected because:** it is the experience this decision exists to remove.

---

## Consequences

### Positive

- The Garmin connection is an ordinary `/api/v1` call: it follows the iOS origin switch to `api.sharpit.app` with no extra work.
- The onboarding and Connections screens share one sheet (`GarminConnectSheet`).

### Negative

- The Garmin password transits SharpIt's server. It must never be logged, stored or echoed; the route logs errors only, never the request body.
- Garmin login runs from Vercel's IPs, which Garmin can challenge or block: MFA accounts are not supported on this path, the widget SSO can be rejected, and on 2026-09-25 the DI exchange rejected the widget's service ticket (`invalid service ticket provided`) for every client id. The error now lists every client id's rejection in the server log and returns a readable message with a reason code.
- `401` is overloaded: the route answers `401` for wrong Garmin credentials, which is also what "SharpIt session invalid" means elsewhere. The iOS client reads the JSON `error` message before the status for this reason. Follow-up: answer wrong Garmin credentials with `422`.

### Scientific debt created

- None.

---

## Findings after the first device test (2026-09-25)

The in-app connect failed on device with `Widget DI exchange failed after ticket … invalid service ticket
provided`. Compared with the reference implementation our code ports (python-garminconnect `client.py`):

- Same widget parameters (`service` = `https://sso.garmin.com/sso/embed`), same ticket regex, same DI
  client ids and exchange body — the request shape is not the difference.
- The reference tries the **mobile** login first through `curl_cffi` with `impersonate='chrome'` (a browser
  TLS fingerprint). Node's `fetch` on Vercel cannot present one, which likely explains why our mobile path
  fails first and the widget fallback runs at all.
- The reference **expects** the DI exchange of a widget ticket to fail at times and falls back to a Garmin
  web session (`JWT_WEB` cookie, `GET <service>?ticket=…`). We have no such fallback, and a cookie session
  would not give the refreshable DI tokens our sync relies on.

Server-side login is therefore fragile by construction. The device-side SSO (Alternative 1) avoids all
three issues: the ticket is minted by the athlete's own browser session, and the web's `sso-callback`
already exchanges such tickets.

---

## Review Criteria

- If more than 1 in 10 in-app Garmin connections fail with `server_sso_rejected`, `rate_limited` or `mfa_required` over a week, switch iOS to Alternative 1 (`ASWebAuthenticationSession`).
- If Garmin publishes a supported OAuth flow for this data, replace both paths with it.
