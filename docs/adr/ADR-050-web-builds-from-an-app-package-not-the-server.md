# ADR-050: The web builds from `@sharpit/app`, never from the server package

**Status:** Accepted  
**Date:** 2026-09-26  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A (extends [ADR-048](./ADR-048-web-repository-becomes-a-monorepo.md))

---

## Context

After ADR-048 phase 3 the web reads and writes through `api.` and reaches no database module, but it still
imported about 190 modules of `@sharpit/server` (formatting, labels, view models, payload types). Every change
to the server package therefore rebuilt and redeployed the web, and the web's typecheck depended on server
code — some client types were `ReturnType<typeof aDatabaseQuery>`.

---

## Decision

A new workspace package, `packages/app` (`@sharpit/app`), holds everything the web needs:

- the pure modules the web reaches (328 files moved from `@sharpit/server`, same subpaths:
  `@sharpit/server/lib/x` → `@sharpit/app/lib/x`);
- the client row types, derived from the shared query shapes with `Prisma.XGetPayload`
  (`lib/query/activity-include.ts`, `lib/query/types.ts`) instead of from the query functions;
- the payload types of `api.`'s `/api/web/*` reads (`lib/web/payloads.ts`); the API's loaders are typed
  against them;
- the types of records, streams and the weekly review, extracted from their database modules;
- the Clerk identity helpers the web's server components need (demo account, admin, sign-in ticket).

Rules, each pinned by a contract: `@sharpit/app` never imports `@sharpit/server`, `@sharpit/db` or an app (not
even a type); the web never imports `@sharpit/server` or `@sharpit/db`; `@sharpit/server` depends on
`@sharpit/app`, never the reverse. The web's Vercel project rebuilds only for `apps/web`, `packages/app`,
`core`, `shared`, `eslint-config` and the Prisma schema.

---

## Rationale

- A server-only change no longer ships the web; a web-only change never shipped the API.
- The web's types stop depending on server implementations: a query refactor that keeps its shape changes
  nothing for the web, and one that changes it fails the API's typecheck against the declared payload first.
- Same subpaths keep the move mechanical and reviewable.

---

## Options considered

### Option A — `@sharpit/app` package (chosen)

### Option B — Move the modules into `packages/shared`

**Rejected because:** `shared` is framework-free by rule; these modules use React, Next, Clerk and Prisma types.

### Option C — Keep the web on `@sharpit/server`, type-only where possible

**Rejected because:** the web's build would still depend on server sources, so its deploy scope could not
shrink.

---

## Consequences

**Positive:**

- Smaller, faster web deploys; the web holds no server code, even transitively.

**Negative:**

- One more package; a type the web needs from a database module must be extracted into `@sharpit/app`.
- The web still runs `prisma generate` (enum values), so a schema change rebuilds it.
