# ADR-049: The public demo is a shared, read-only Clerk account

**Status:** Accepted  
**Date:** 2026-09-26  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** [ADR-026](./ADR-026-public-demo-mode.md) (its entry, identity and exit mechanism only — the demo tenant, its seed and its read-only product rules stand)

---

## Context

ADR-026 gave demo visitors a `sharpit_demo=1` cookie and no Clerk session; the web's own route handlers
resolved the demo tenant from that cookie. ADR-048 phase 3 moves every web read and write to `api.sharpit.app`,
which accepts a Clerk Bearer only and never reads a cookie, and removes the database from the web. A cookie-only
visitor can reach neither.

---

## Decision

The demo tenant is served to a real Clerk user, created on first use by the server (`externalId: sharpit-demo`,
no password, `publicMetadata.demo`):

1. `GET /demo` (web) creates a one-time Clerk sign-in ticket (60 s) for that user and redirects to
   `/sign-in?__clerk_ticket=…&redirect_url=/` — the same redemption as the Garmin handoff (ADR-047). No cookie of
   ours; no database access on the web.
2. `getCurrentAthleteId()` maps that Clerk user to the demo athlete (`clerkUserId: 'demo'`, unchanged), never to
   a profile of its own. `isDemoSession()` is "the signed-in user is the demo user" — one lookup by `externalId`,
   cached per server instance.
3. Read-only is enforced by both proxies (`api.` and web) for that user: any write under `/api/` and any provider
   connect answer `403 Mode démo : lecture seule`.
4. Leaving the demo is a Clerk sign-out to `/sign-in`. The client knows it is in the demo from the signed-in
   user's `externalId` (`useIsDemoMode()`), not from a cookie.

---

## Rationale

- One authentication model for every visitor: the web calls `api.` the same way for the demo and for athletes.
- A real session wins over the demo by construction: a signed-in athlete opening `/demo` is sent on by the
  sign-in page, never switched to the demo account.
- The demo account holds nothing a visitor could damage: writes are refused before any handler runs.

---

## Options considered

### Option A — Shared Clerk account (chosen)

### Option B — Keep a read-only database role on the web for the demo

**Rejected because:** the web would keep a database secret and a second read path, the two things phase 3
removes.

### Option C — Drop the web demo

**Rejected because:** the demo is the no-signup entry of the sign-in page.

---

## Consequences

**Positive:**

- The web needs no database and no demo cookie; `/api/demo/exit` is gone.

**Negative:**

- Every demo visitor shares one Clerk user (one session each). Clerk's sign-in token and user-lookup calls are
  on the `/demo` path; a flood of `/demo` hits spends Clerk API quota.
- Settings shows a sign-out for the demo account (it is a signed-in session).
