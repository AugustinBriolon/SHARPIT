# Web App Audit & Roadmap

**Type**: Product + engineering audit, with prioritized roadmap
**Date**: 2026-08-19
**Method**: Code-grounded. Every claim below was verified against the source tree at `7e98986`, not inherited from existing documentation.
**Status**: Proposal — the roadmap is a recommendation, not law. The audit findings are factual.

---

## Preamble — why this audit re-derives everything

`docs/product/PRODUCT.md` (Part III) already ships a friction map and a five-tier prioritization. That map is **partly stale**: several frictions it lists as Critical have since been fixed in code, and the roadmap it implies would therefore spend Tier-1 effort on solved problems.

This audit was conducted by reading the code first and the docs second. Where they disagree, the code is reported as truth. Correcting the friction map is itself one of the findings.

---

## Part I — State of the system

### Scale and vital signs

| Dimension | Measured |
| --------- | -------- |
| Source files | 1 209 `.ts`/`.tsx` |
| Lines of code | ~156 000 |
| Test files / tests | 262 files · 1 599 tests (1 560 pass, 12 skipped) |
| Prisma models | 44 |
| Migrations | 54 |
| API route handlers | 95 |
| App pages | 27 |
| E2E specs | 3 |
| Commits, last 60 days | 50 |
| `TODO`/`FIXME` in `src/` | **1** |

### What is genuinely strong

These are not courtesies. They are unusual and worth protecting.

- **Auth has no holes.** Every route is protected centrally by `src/proxy.ts` (Clerk `auth.protect()`), with only `/sign-in`, `/sign-up`, `/api/cron/*` and `/~offline` public. The cron path is separately guarded by `CRON_SECRET` (`src/app/api/cron/sync/route.ts:23`). The dev escape hatch is correctly double-gated on `NODE_ENV === 'development'` **and** `DEV_BYPASS_CLERK === 'true'` (`src/lib/dev/dev-auth.ts:5`), and `/api/dev/*` additionally requires `DEV_TOOLS_ENABLED`. I found no unauthenticated data path.
- **Service worker discipline.** `/api/*` and `/__clerk/*` are `NetworkOnly` — athlete data is never cached to disk (`src/sw.ts:23-29`). `skipWaiting: false` with explicit athlete confirmation avoids swapping assets under an open coaching dialog. This is more careful than most PWAs.
- **Code splitting is real.** `maplibre-gl` and `recharts` — the two heavy dependencies — are behind `next/dynamic` in 10+ call sites rather than imported into shared bundles.
- **One TODO in 156k lines.** Debt is being paid down rather than annotated.
- **The Core is well tested.** 1 560 passing tests, concentrated on pure domain functions, is a genuine asset and the reason the "frozen Core" posture is credible.

### Verification I could not complete

`prisma generate` could not run in this sandbox (the Prisma engine download fails through the environment's proxy), so the generated client is absent. Consequences, stated plainly:

- `yarn typecheck` reports errors **only** of the form "`@prisma/client` has no exported member `GoalKind`" plus the implicit-`any` cascade that follows. No other type errors appeared. I read this as passing, but I did not observe a clean run.
- `yarn test` shows 63 test *files* failing to import, all with `MODULE_NOT_FOUND: .prisma/client`. The 1 560 tests that do not touch Prisma pass. I did not observe the full suite green.
- `yarn lint` and `yarn build` could not run at all (missing unplugged `prettier-plugin-tailwindcss`, then Prisma).

**These are sandbox limitations, not defects.** But they mean the audit's engineering findings come from reading code, not from a green pipeline. Re-run all four locally before acting on Phase 0.

---

## Part II — Findings

### F1 — The documentation's friction map misdirects planning ⚠️ *highest-leverage finding*

`docs/product/PRODUCT.md` lists four **Critical** frictions. Verified against code:

| Documented Critical friction | Actual state |
| ---------------------------- | ------------ |
| "Inference not triggered post-sync — Twin stale when athlete opens app" | **Fixed.** `cron/sync` calls `refreshAthleteState({ skipSync: true, source: 'cron' })` (`src/app/api/cron/sync/route.ts:152`). |
| "`INSUFFICIENT_DATA` blocks entire Today" | **Largely fixed.** `TodayDashboard` degrades to `TodayEmptyState`, a `SnapshotStatusBanner`, and an offline snapshot path rather than a blank wall (`src/components/today/today-dashboard.tsx:78-100`). |
| "Daily briefing generated but never shown" | **Still true** — see F2. |
| "No morning push notification with verdict" | **Still true** — see F3. |

Two further documented frictions are also stale: "no adaptation drill-down" (a `/today/adaptation` page exists) and "cron sync 3×/day" (it runs **6×/day** — 06:30, 09, 12, 15, 18, 21 UTC — plus `planned-forecast` at 19:00, per `vercel.json`).

**Why this matters more than any single bug:** the doc is described in `AGENTS.md` as the document agents and contributors read *before implementing*. A stale friction map means effort gets aimed at solved problems. Fixing the map is nearly free and improves every subsequent decision.

### F2 — Intelligence is generated, persisted, and never shown 🔴

Five hooks exist, are fully wired to routes and fetchers, and have **zero consumers** anywhere outside `src/hooks/` and `src/app/api/`:

| Hook | Defined | Backing pipeline |
| ---- | ------- | ---------------- |
| `useDailyBriefing` | `src/hooks/use-coach.ts:214` | `DailyBriefing` model; generated via `refreshAthleteState` on every cron run |
| `useGenerateBriefing` | `src/hooks/use-coach.ts:221` | — |
| `useWeeklyReview` | `src/hooks/use-coach.ts:249` | `WeeklyReview` model; `generateAndStoreWeeklyReview()` every Sunday (`cron/sync/route.ts:163`) |
| `useGenerateWeeklyReview` | `src/hooks/use-coach.ts:256` | — |
| `useBodyViewModel` | `src/hooks/use-presentation-view-model.ts` | `/api/presentation/body` |

The system pays LLM cost on every cron run to write a daily briefing into Postgres, and pays again every Sunday for a weekly review. **No screen renders either one.** This is the single largest gap between what SHARPIT knows and what the athlete experiences — and it is precisely the failure mode `PRODUCT.md` Part II warns against: *"Prefer exposing, refining, and orchestrating the intelligence that already exists."*

By the doc's own seven-question test, surfacing these scores 7/7. It is also the cheapest Tier-1 work available: the data, the route, the fetcher, and the hook all already exist. What is missing is a component.

### F3 — No notification capability exists at all 🟠

No `pushManager`, no `web-push` dependency, no `Notification` API usage, no VAPID configuration anywhere in the tree. The app is an installable PWA with an offline story, but it **cannot deliver anything to an athlete who has not opened it**.

Moment 1 ("Wake") in the athlete journey is defined as *"Meet the athlete at consciousness with a single, honest answer — before they drown in Garmin, messages, or guilt."* Without push, that moment structurally cannot be served — the athlete must remember to open the app, which is the habit-loop dependency the manifesto explicitly refuses to build ("A notification machine"). The resolution is not engagement notifications; it is **one scheduled, silenceable, verdict-carrying notification per morning**, which is consistent with §XI (silence over noise) because it replaces an app-open with an answer.

### F4 — `GET /api/presentation/today` performs a database write 🟠

`src/app/api/presentation/today/route.ts:22` calls `ensureMorningRecalibration(trainingDayId)`, which creates a `CoachingDecision` proposal, inside a `GET` handler. The code comments acknowledge this ("Write side-effect stays on the route (ADR-007 incremental)").

This breaks HTTP safety semantics with concrete consequences: any prefetch, any retry, any double-render, any future edge cache, or any `<link rel=prefetch>` fires a write. It also means the Today read path cannot ever be made cacheable or statically revalidated without first untangling this.

### F5 — Query-key law is violated across the newest layer 🟠

`ARCHITECTURE.md` §7.2 is unambiguous: *"All query keys live in `src/lib/query/keys.ts`. Never write a query key inline."*

`src/hooks/use-presentation-view-model.ts` imports `queryKeys` and then writes **nine** inline keys anyway:

```
queryKey: ['presentation', 'recovery', trainingDayId]   // :34
queryKey: ['presentation', 'sleep', trainingDayId]      // :43
queryKey: ['presentation', 'effort', trainingDayId]     // :52
… 6 more
```

And `src/hooks/use-planned-sessions.ts:328` invalidates `['presentation', 'today']` inline. **Invalidation currently works only because two independently-typed string arrays happen to match.** Any drift silently breaks cache invalidation — the exact failure mode §M3 describes, with no type error and no test to catch it. This is the newest layer in the codebase, which means the violation is spreading, not receding.

### F6 — Known violations remain open 🟡

From `ARCHITECTURE.md`'s own appendix, still present:

- **M9 — module-level cache in serverless.** `src/lib/coach/coach-context.ts:95` still declares `let contextCache`. On Vercel this is per-isolate: it neither reliably hits nor reliably invalidates. Documented as broken; still shipping.
- 99 occurrences of `: any` / `as unknown as` across `src/`.
- `staleTime` gaps: `use-coach.ts` has 5 `useQuery` calls and 2 `staleTime` values; `use-planned-sessions.ts` has 5 and 4.

### F7 — Component size law is widely breached 🟡

§6.3 mandates ≤150 lines for views, ≤80 for leaves.

| File | Lines |
| ---- | ----- |
| `src/components/ui/map.tsx` | 2 045 |
| `src/components/planning/session/planned-session-dialog.tsx` | 945 |
| `src/components/settings/integrations/modal-content.tsx` | 859 |
| `src/components/planning/planning-view.tsx` | 651 |
| `src/components/coach/chat/coach-chat.tsx` | 623 |

`today-dashboard.tsx` at 135 lines shows the standard is achievable where it was applied. Note `map.tsx` is a genuine outlier — a MapLibre wrapper is legitimately dense — but 2 045 lines in one file is a review blind spot regardless.

### F8 — E2E covers navigation, not the product's core promise 🟡

Three specs exist: `activity-state`, `instant-navigation`, `navigation-shell`. All three test the shell. **None tests the morning journey** — the highest-frequency moment in the product's lifetime, and the one whose regression would be most damaging and least visible to unit tests.

---

## Part III — Roadmap

Sequenced by athlete impact per unit of effort, and constrained by the standing doctrine: *express the Twin, do not add engines.*

Effort: **S** ≈ ≤1 day · **M** ≈ 2–4 days · **L** ≈ 1–2 weeks.

### Phase 0 — Restore trust in the map (S, do first)

Cheap, unblocks correct decisions by everyone downstream.

| # | Work | Effort |
| - | ---- | ------ |
| 0.1 | Rewrite the `PRODUCT.md` friction map against verified code state; move the three fixed frictions to a "Resolved" section with commit references | S |
| 0.2 | Correct the cron cadence (6×/day, not 3×) wherever documented | S |
| 0.3 | Update `ARCHITECTURE.md`'s known-violations appendix — add F5 (inline presentation keys) and F4 (GET write) | S |

**Do not skip this.** Everything below is planned against the corrected map.

### Phase 1 — Surface what already exists (highest ROI)

Zero new engines. Every item renders intelligence the system already computes and stores. This *is* the doctrine in Part II of `PRODUCT.md`.

| # | Work | Effort | Serves |
| - | ---- | ------ | ------ |
| 1.1 | **Daily Brief surface** — render `useDailyBriefing` on Today as a progressive-disclosure panel under the verdict hero. The three-paragraph narrative is already written and stored; nothing but a component is missing | M | Moments 2, 12 |
| 1.2 | **Weekly Review surface** — render `useWeeklyReview` as a Sunday/Monday arc narrative, entered from the existing Coach menu beside the deterministic Weekly Coaching Brief | M | Weekly arc |
| 1.3 | **Body view model** — surface or delete `useBodyViewModel`. Either is acceptable; leaving a wired, untested, unrendered path is not | S | Corps |
| 1.4 | **Decide the briefing's economics** — if 1.1/1.2 are deferred, gate LLM briefing generation behind a flag rather than paying per-cron for output no one reads | S | Cost |

> **Framing note:** 1.1 and 1.2 are not "new features." They are the completion of features that were built, paid for, and left one component short of the athlete.

### Phase 2 — Repair the foundations the next phase stands on

| # | Work | Effort | Why now |
| - | ---- | ------ | ------- |
| 2.1 | Move the nine presentation query keys into `src/lib/query/keys.ts`; add a lint rule banning inline `queryKey:` arrays | S | F5 — silent cache bugs; blocks safe growth of the presentation layer |
| 2.2 | Move `ensureMorningRecalibration` out of the `GET` — either into the existing `POST /api/morning-recalibration`, or into `refreshAthleteState` during cron | M | F4 — unblocks any future caching of the Today read path |
| 2.3 | Replace the `coach-context` module cache with a request-scoped or KV cache | S | F6/M9 — documented as broken in serverless |
| 2.4 | E2E spec for the morning journey: cold load → verdict → wellness check-in → verdict revision | M | F8 — protects the product's core promise |

### Phase 3 — Close the delivery gap (new capability)

The first genuinely new functionality, and the one the journey doc has wanted since Moment 1.

| # | Work | Effort | Serves |
| - | ---- | ------ | ------ |
| 3.1 | **Web Push infrastructure** — VAPID keys, subscription storage, `pushManager` registration in the existing SW, athlete-controlled opt-in in Settings | L | Moment 1 |
| 3.2 | **Morning verdict notification** — one notification, athlete-chosen local time, carrying the verdict sentence and nothing else. No streaks, no urgency, no re-engagement nags | M | Moment 1 |
| 3.3 | **Post-sync "interpretation ready" signal** — silent by default; surfaces only when a new activity materially changed the Twin | M | Moments 7, 8 |

**Constitutional guard for this phase:** §XI (silence over noise) and the explicit refusal to become "a notification machine." The test for every notification added here is: *does this replace an app-open with an answer?* If it instead manufactures an app-open, it does not ship.

### Phase 4 — Contextual modes (new functionality, expresses existing Twin state)

The Twin already computes periodization phase, goal proximity (J-*), taper state, and injury constraints. None of it changes the product's voice.

| # | Work | Effort | Serves |
| - | ---- | ------ | ------ |
| 4.1 | **Race week / taper mode** — Today's narrative and verdict language shift to freshness and arrival; taper physiology normalized rather than read as decline | M | Race week, taper |
| 4.2 | **Injury → verdict pipeline** — `PhysicalNote`/`Condition` visibly constrain the daily verdict and planning, not just the Corps page | M | Injury arc |
| 4.3 | **Evening review + pre-sleep check-in** — closes the day, feeds tomorrow's subjective dimension | M | Moments 12, 13 |
| 4.4 | **Off-season mode** — maintenance framing when no goal is within horizon | S | Off-season |

### Phase 5 — Structural hygiene (continuous, not a sprint)

| # | Work | Effort |
| - | ---- | ------ |
| 5.1 | Decompose the five components over 600 lines, starting with `planned-session-dialog.tsx` (945) — highest churn, highest review risk | L |
| 5.2 | Retire the 99 `any`/`as unknown as` occurrences, prioritizing any on the serialization boundary (§M5 hydration bugs are invisible to `tsc`) | M |
| 5.3 | Backfill `staleTime` in `use-coach.ts` and `use-planned-sessions.ts` | S |

---

## Part IV — What I recommend against

Stating these explicitly, because each is a plausible-sounding path that the constitution forbids.

- **Do not add inference engines.** The Core is frozen and the audit found no gap in it. Every finding above is an expression gap, not a modeling gap.
- **Do not build engagement notifications.** Phase 3 is a delivery mechanism for one daily answer. Streaks, badges, and re-engagement pushes are explicitly refused by §VII of "What SHARPIT Refuses to Become."
- **Do not migrate to multi-tenant** without an ADR. §1 of `ARCHITECTURE.md` is explicit, and `AthleteProfile`'s singleton `PROFILE_ID` pattern makes the change far larger than it looks.
- **Do not chase the `map.tsx` line count first.** It is the most visible violation and among the least harmful — a dense MapLibre wrapper with a stable interface. F5's nine inline query keys are three lines of work and a real correctness risk; that is the better trade.

---

## Summary — the one-sentence version

SHARPIT's engineering is in better shape than its documentation claims, and its product is in worse shape than its architecture deserves: **the system computes a daily briefing and a weekly review, stores them, and shows the athlete neither** — and it cannot reach the athlete at all before they open the app.

Fix the map, ship the two surfaces that already exist, then build the one delivery mechanism the morning contract requires.

---

*Audit conducted 2026-08-19 against `7e98986`. Engineering findings derive from source reading; `typecheck`, `lint`, `test`, and `build` could not be fully executed in the audit environment (see Part I).*
