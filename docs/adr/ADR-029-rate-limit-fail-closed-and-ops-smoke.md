# ADR-029: Sensitive rate-limit fail-closed + ops smoke

**Status:** Accepted  
**Date:** 2026-09-02  
**Author:** Cloud agent (V0 trust)  
**Supersedes:** N/A

---

## Context

Upstash rate limiting **failed open** when Redis env vars were missing or Redis errored — fine for the global flood backstop (`apiGeneral`), unsafe for coach / provider sync / AI analyze routes where a missing limiter means uncapped AI/DB cost.

There was also no minimal ops probe to surface missing `CRON_SECRET` / `SECRET_ENCRYPTION_KEY` without leaking secret values.

« Cercle privé » is a go-to-market stance only (no social/network marketing). It is **not** a technical signup access control — classic open Clerk signup remains.

---

## Decision

1. **Rate limit fail-closed** on sensitive limiters (coach*, providerSync, sessionAnalyze, activityNarrative) via `checkRateLimit(..., { failClosed: true })` → HTTP 503 with clear FR copy when Upstash is missing/broken. `apiGeneral` stays fail-open.

2. **Ops smoke** at `GET /api/cron/smoke` (Bearer `CRON_SECRET`) reports configured/missing/ok for cron secret, encryption key (+ roundtrip), and Upstash — never echoes secret values.

---

## Rationale

- Fail-closed only where cost/abuse matters; fail-open for the broad API flood backstop preserves availability during Redis blips.
- Minimal smoke beats a new ops platform for V0.
- Signup stays classic — product “private circle” is distribution strategy, not an allowlist/invite gate.

---

## Alternatives Considered

### Fail-closed everywhere including `apiGeneral`

**Pros:** Strict. **Cons:** Redis blip takes the whole authenticated API down.

### Signup invite / email gates

**Pros:** Would block open signup. **Cons:** Rejected — « cercle privé » is GTM only, not technical access control.

---

## Consequences

- Production must keep Upstash env vars set (already present in Vercel) or coach/sync return 503.
- Ops can hit `/api/cron/smoke` with `Authorization: Bearer $CRON_SECRET` after deploys.
