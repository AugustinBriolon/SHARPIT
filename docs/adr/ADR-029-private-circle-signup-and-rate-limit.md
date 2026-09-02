# ADR-029: Private-circle signup gate + sensitive rate-limit fail-closed

**Status:** Accepted  
**Date:** 2026-09-02  
**Author:** Cloud agent (V0 trust)  
**Supersedes:** N/A (partially restores app-level signup restriction retired in ADR-025 Phase 2, without resurrecting `AccessGate` / `ALLOWED_EMAILS`)

---

## Context

ADR-025 Phase 2 retired `ALLOWED_EMAILS` / `AccessGate` so tenant access became “any Clerk session + lazy `AthleteProfile` provision.” That is correct for multi-tenant architecture, but **open signup is Critical** for private-circle commercialization: anyone who reaches `/sign-up` can create an account and burn AI/sync cost.

Separately, Upstash rate limiting **failed open** when Redis env vars were missing or Redis errored — fine for the global flood backstop, unsafe for coach / provider sync / AI analyze routes.

---

## Decision

1. **Private-circle signup gate** (`src/lib/auth/signup-gate.ts`):
   - Prefer Clerk Dashboard Allowlist / Invitations as the first line of defense.
   - App-level fallback via `SIGNUP_GATE_ENABLED`, `SIGNUP_ALLOWED_EMAILS`, `SIGNUP_INVITE_CODES`.
   - Existing `AthleteProfile` rows are never blocked; only brand-new provisioning is gated.
   - Unauthorized new sessions redirect to `/access-denied` (FR copy). Demo (`/demo`) remains public (ADR-026).

2. **Rate limit fail-closed** on sensitive limiters (coach*, providerSync, sessionAnalyze, activityNarrative) via `checkRateLimit(..., { failClosed: true })` → HTTP 503 with clear FR copy when Upstash is missing/broken. `apiGeneral` stays fail-open.

3. **Ops smoke** at `GET /api/cron/smoke` (Bearer `CRON_SECRET`) reports configured/missing/ok for cron secret, encryption key (+ roundtrip), Upstash, and signup gate — never echoes secret values.

---

## Rationale

- Defense in depth: Clerk can still misconfigure; the app must not provision unauthorized tenants.
- Grandfathering existing athletes avoids locking Augustin (and circle members already in) out.
- Fail-closed only where cost/abuse matters; fail-open for the broad API flood backstop preserves availability.
- Minimal smoke beats a new ops platform for V0.

---

## Alternatives Considered

### Clerk-only restrictions

**Pros:** No app code. **Cons:** Misconfiguration = open signup; no invite-code UX in-product; harder to verify in CI.

### Resurrect `ALLOWED_EMAILS` / `AccessGate`

**Pros:** Familiar. **Cons:** Conflicts with ADR-025 multi-tenant model; would block all non-listed sessions including existing users if mis-set.

### Fail-closed everywhere including `apiGeneral`

**Pros:** Strict. **Cons:** Redis blip takes the whole authenticated API down.

---

## Consequences

- Production must set Upstash env vars (already present in Vercel) or coach/sync return 503.
- Production should set `SIGNUP_GATE_ENABLED=true` plus allowlist and/or invite codes, and mirror restrictions in Clerk.
- Unauthorized Clerk users who somehow sign up see `/access-denied` and can use `/demo` or sign out — they do not get an `AthleteProfile`.
