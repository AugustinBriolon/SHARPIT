# ADR-040: iOS is the product client; `/api/v1` is the canonical contract

**Status:** Accepted  
**Date:** 2026-09-15  
**Author:** Augustin Briolon (with Cursor)  
**Related:** [ADR-039](./ADR-039-ios-system-edge-fade.md), SHARPIT-APP `docs/superpowers/specs/2026-09-15-ios-native-v1-design.md`

---

## Context

SHARPIT began as a Next.js product with presentation routes (`/api/presentation/*`) shaped for the web UI. A native iPhone client needs a stable, versioned JSON contract that is not coupled to React view models, cookies, or presentation-only fields.

Native auth uses Clerk Bearer JWTs. The web UI remains complementary.

---

## Decision

1. **iOS is the product client** for day-to-day athlete use. The Next.js app stays the complementary web surface (onboarding, admin, deep links).
2. **Canonical HTTP contract:** `GET /api/v1/*` (starting with `GET /api/v1/today`). Versioned JSON, Bearer Clerk JWT, no reliance on `/api/presentation/*`.
3. **Core stays server-side** in the SHARPIT TypeScript repo. iOS is a thin SwiftUI client: Clerk on the main actor, `actor SharpitClient` for HTTP, DTOs without Clerk imports.
4. Presentation routes may remain until the web migrates; they are not the native contract.

---

## Consequences

- Two JSON shapes until web migrates off presentation routes.
- Native clients must register in Clerk Native applications and use Associated Domains `webcredentials:{FRONTEND_API_HOST}`.
- Debug iOS points at `http://127.0.0.1:3000`; production origin is configured separately before Release.
