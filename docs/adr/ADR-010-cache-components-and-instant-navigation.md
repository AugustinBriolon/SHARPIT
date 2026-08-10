# ADR-010: Cache Components and Partial Prefetching for instant navigation

**Status:** Accepted  
**Date:** 2026-08-10  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

SHARPIT's Instant UX doctrine has always been enforced on the **data** side: TanStack Query holds warm data, `usePrefetchNavQuery` warms nav destinations on hover, and pages paint chrome plus value micro-skeletons rather than blank screens. All athlete data flows through `/api` route handlers, not through RSC.

That left one gap the client cache cannot close: the **route shell** — the RSC payload and segment JS for a route the athlete has not visited yet. Reaching it still cost a server round trip, and Next.js 16.2 made that worse by firing one prefetch per visible `<Link>`, so a list of twenty activity links produced twenty prefetch requests for the same route.

Next.js 16.3 addresses both with two opt-in flags:

- **`cacheComponents`** — every route gets a prerendered static shell served immediately, with dynamic content streaming into `<Suspense>` boundaries. It also replaces the route-level `dynamic` / `runtime` / `revalidate` segment configs, and preserves client state across navigations with React `<Activity>` instead of unmounting.
- **`partialPrefetching`** — `<Link>` prefetches **one reusable App Shell per route** instead of one payload per link, cached for the session.

Enabling them surfaced, as build errors, every place the app read request-time state above a boundary. Those were not new bugs, but they were the reason no route could produce a shell.

---

## Decision

Enable `cacheComponents` and `partialPrefetching`, and restructure the app so every route produces a non-empty prerendered shell: request-time reads move behind `<Suspense>`, and page chrome stays outside it.

---

## Rationale

The framework work and the existing doctrine point the same way. "Chrome + value micro-skeletons, never a blank screen" is exactly what a good static shell contains; Cache Components turns that convention into something the build validates and the client prefetches.

Three findings made this worth doing rather than shipping the flags and stopping:

1. **The root layout read the theme cookie**, which made every route in the app runtime-dependent. The read was already redundant — `THEME_INIT_SCRIPT` sets the theme before paint and `ThemeProvider` re-reads it on mount — so it cost the entire app its shell for nothing.
2. **The `(app)` layout awaited Clerk before rendering anything.** Rendering the allow-list gate as a sibling overlay instead of a wrapper keeps the chrome and every page below prerenderable.
3. **The nav bars read the URL only to highlight the active item.** Putting a boundary around just the highlight, with the identical unhighlighted link as its fallback, keeps the nav in the shell at no visual cost.

The result: every page route builds as a partial prerender rather than fully dynamic, and each is fetched once per session instead of once per link.

The flags will become default in a future major version, so this is also the migration happening on our schedule rather than on the upgrade's.

---

## Alternatives Considered

### Alternative 1: Enable the flags, accept `instant = false` on the `(app)` layout

**Description:** Take the framework wins that need no restructuring and exempt the authenticated area from shell validation.

**Pros:**

- Small diff, no change to the auth gate or nav.
- Still gets Activity state preservation, prefetch inlining and the 16.3 runtime gains.

**Cons:**

- Every `(app)` route stays fully dynamic, so `<Link>` has no shell to prefetch and the main nav destinations keep waiting on the server — the exact problem this work exists to fix.
- Leaves the theme-cookie and render-time-clock reads in place, which are latent bugs regardless of the flags.

**Rejected because:** it buys the framework upgrade without the outcome. Measured against "does clicking a nav item feel instant", it changes nothing.

### Alternative 2: Keep the data layer in RSC instead of `/api` + TanStack Query

**Description:** Move athlete data into Server Components and `use cache`, letting Cache Components own both shell and data.

**Pros:**

- One caching model instead of two.
- Would make `use cache` and `cacheLife` meaningful for domain data.

**Cons:**

- Rewrites the whole data layer during a stabilization phase, against a frozen Core.
- Discards optimistic mutations, `refetchOnReconnect`, and the offline snapshot path that ADR-008 depends on.

**Rejected because:** the two layers solve different problems. TanStack Query owns data freshness and offline behaviour; Cache Components owns shell delivery. Keeping them separate is the smaller and more reversible decision.

---

## Consequences

### Positive

- Every page route is a partial prerender with a real shell; nav destinations no longer wait on the server for their chrome.
- One prefetch per route per session instead of one per link.
- Client state now survives navigating away and back (React `<Activity>`), which suits an athlete moving between Today, Training and a drill-down.
- Fixed three latent bugs the validation surfaced: the redundant theme cookie read, `usePrefetchNavQuery` pinning "today" at render time (so a session open across midnight warmed the wrong day), and an activity draft that stayed in the form after saving.
- 79 `dynamic = 'force-dynamic'` and 13 `runtime = 'nodejs'` exports removed — all were no-ops.

### Negative

- **A signed-in account that is not on the allow-list now sees empty app chrome for a moment** before the denial panel covers it. The Clerk proxy still blocks anonymous requests, and `/api` routes never enforced the allow-list, so no real boundary moved — but the UX of that path is worse.
- More `<Suspense>` boundaries to reason about. Where a boundary sits now determines what the athlete sees during a navigation, not just during a page load, and a misplaced one fails silently at runtime rather than loudly at build time.
- `(app)/template.tsx` had to go: a template re-keys its children on every navigation, resetting exactly the state Activity preserves.
- Any client state that assumed unmount now needs an explicit reset. Handled for the activity form; other forms and popovers are unaudited.

### Scientific debt created

- None.

---

## Review Criteria

Revisit if any of the following holds:

- Instant Insights or the `instant()` Playwright tests start flagging a nav destination as blocking — it means a boundary or a request-time read has drifted back above the shell.
- The allow-list becomes a real security boundary (more than one account, or `/api` routes start enforcing it), in which case the gate belongs back above the shell and the routes below lose their prerender.
- The data layer moves into RSC, which would make Alternative 2 live and this split obsolete.
- Cache Components becomes the default in a future major version, at which point the flags in `next.config.ts` are redundant and should be dropped.
