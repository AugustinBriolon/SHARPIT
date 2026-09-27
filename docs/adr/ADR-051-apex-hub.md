# ADR-051: The apex is served by its own app, `apps/hub`

**Status:** Accepted — cut over 2026-09-27  
**Date:** 2026-09-27  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A (phase 4 of [ADR-048](./ADR-048-web-repository-becomes-a-monorepo.md))

---

## Context

After phase 3, `sharpit.app` and `web.sharpit.app` were two names of one deployment: the web app. The apex
carries a contract the iOS app depends on — the Apple app-site association, the native Garmin handoff
(`/connect/garmin/*`, ADR-047) and the legal pages the app opens — which changes with every web deploy, and the
web project had to keep answering on the apex.

---

## Decision

`apps/hub`, a small Next.js app deployed as Vercel project `sharpit-hub` (region `lhr1`), serves `sharpit.app`
and `www.sharpit.app`:

- `/.well-known/apple-app-site-association` (outside Clerk's proxy), `/connect/garmin`, `/start`, `/authorize`,
  `/callback`, `/privacy`, `/terms`, and `/sign-in` (where the handoff redeems its one-time ticket);
- `/` is the public landing (since 2026-09-27, `apps/hub/src/components/landing`, GSAP ScrollTrigger motion,
  copy in `@sharpit/app/lib/landing/landing-copy.ts` under the teaser's forbidden-copy wall);
- every other path redirects (307, path and query kept) to `https://web.sharpit.app`.

Shared UI lives in `packages/ui` (`@sharpit/ui`): the design system CSS, fonts, button, skeleton, auth shell,
providers, the Garmin SSO parts, `apiFetch` and the server-side `api.` client. The web imports it too. The hub,
like the web, never imports `@sharpit/server` or `@sharpit/db`; it reads through `api.` with a Clerk Bearer.

Cutover order (the apex contract must never break): deploy the hub → move `sharpit.app` and `www.sharpit.app`
from `sharpit-webapp` to `sharpit-hub` → only then merge the web change that drops those pages (the web then
redirects `/privacy`, `/terms`, `/connect/*`, `/.well-known/*` on `web.` to the apex). Runbook:
`docs/architecture/APEX_HUB_CUTOVER.md`.

---

## Rationale

- The iOS contract ships only when the hub changes; a web deploy cannot break it.
- The hub holds four secrets-free variables plus the Clerk secret, nothing else.
- No UX change: the apex landing stays the web's `/welcome` (redirect); a dedicated landing and `/docs` come
  with their content.

---

## Options considered

### Option A — `apps/hub` + `@sharpit/ui` (chosen)

### Option B — Keep the apex on the web project

**Rejected because:** the apex contract would keep shipping with every web deploy.

### Option C — Copy the shared components into the hub

**Rejected because:** two copies of the design system drift.

---

## Consequences

**Positive:**

- Three independent deploys: api., web., apex.

**Negative:**

- One more Vercel project and package; apex visitors of app paths take one redirect.
- `/docs` is not built yet (no content).
