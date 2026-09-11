# ADR-033: Drill-down date strip with per-day data availability

**Status:** Accepted  
**Date:** 2026-09-11  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A  
**Related:** [ADR-022](./ADR-022-temporal-product-navigation.md), [ADR-026](./ADR-026-public-demo-mode.md), [ADR-028](./ADR-028-animation-technology-and-press-feedback.md)

---

## Context

The five physio drill-downs (Sommeil, Récupération, Charge, Adaptation, Nutrition) share one date selector through `PhysioDrillDownHero`. Until now it was a centered, fixed-width pill (`w-[15.5rem]`) with ‹ › arrows and a calendar dialog. `DESIGN_LANGUAGE.md` required this form.

It had two problems:

- **Moving through time was slow.** One day per tap, or open the calendar. On mobile the athlete could not scan the last few weeks at a glance.
- **The athlete navigated blind.** Nothing told them which days had any sleep, recovery, activity or nutrition data. Choosing a day without data led to an empty page.

Constraints:

- Core is frozen. Knowing whether a day has data must not rebuild an `AthleteSnapshot` per day.
- The demo session is limited to its seeded window (`minDate`, ADR-026).
- Next keeps visited routes mounted under `display: none` (Cache Components). A strip can mount while it has no width.
- §11.3 of the design language says a state dot always comes with a text label.

---

## Decision

Replace the pill with a **horizontal day strip** and add a **per-day data availability dot**, in both the strip and the calendar.

1. **Strip.** Each day is a card showing the day number and a short weekday. The selected day is inverted (`bg-foreground text-background`) and today has an outline. The rest of the current week is shown but disabled. The strip scroll-snaps and centers the selected day. On every viewport it grows toward the past by 28 days when the athlete scrolls near its oldest day. It stops at `minDate`.
2. **Calendar entry.** The month label above the strip ("septembre 2026" plus a calendar icon) opens the existing calendar dialog, and so does tapping the already-selected day. From `sm` up, ‹ › arrows sit next to the header. ←/→ inside the strip step one day.
3. **Availability endpoint.** `GET /api/presentation/data-days?domain=…&from=…&to=…` returns `{ days: string[] }`. A range is capped at 92 days. What counts as data is a raw signal per domain (`src/lib/presentation/data-days.ts`):

   | Domain       | Day has data if                                                |
   | ------------ | -------------------------------------------------------------- |
   | `sleep`      | `DailyHealth.sleepMinutes > 0`                                 |
   | `recovery`   | `DailyHealth` has hrv, restingHr, recoveryScore or bodyBattery |
   | `effort`     | at least one `Activity` on that training day                   |
   | `adaptation` | a sleep or recovery signal, or an activity                     |
   | `nutrition`  | `DailyNutrition.calories > 0`                                  |

   Health rows go through `getHealthEntries`, so the athlete's wearable source preference still applies.

4. **Caching.** The client asks for fixed 28-day chunks anchored on today (`data-days-chunks.ts`). The strip and the calendar therefore share cache entries, and scrolling back only fetches the new chunk. Keys live under `['presentation', 'data-days', …]`, so every provider-sync invalidation of `presentationRoot` also refreshes the dots.
5. **Dot semantics.** The dot is decorative (`aria-hidden`). Each day control says the status in its accessible name ("· données disponibles" / "· aucune donnée"), and the calendar has a visible legend: "● Données disponibles". This is the sanctioned pairing for this dot under §11.3.

---

## Rationale

- A strip shows several weeks without a dialog and matches the native pattern athletes already know from calendar and health apps.
- Raw signals answer "is there something to read on this day?" cheaply. One indexed query per source and chunk, no snapshot rebuild. They stay true to what each drill-down reads.
- Fixed chunks turn infinite scroll into a bounded number of cacheable requests, instead of one ever-growing range that refetches everything.
- The domain is fixed per hero, so the five call sites pass `dataDomain` as a literal. No screen or page-view had to change.

---

## Alternatives Considered

### Alternative 1: Derive availability from each view model's `emptyState`

**Description:** Build the drill-down view model for each visible day and check `emptyState`.

**Pros:**

- Exactly matches what the page would show.

**Cons:**

- One snapshot build per day. Twenty-eight days means twenty-eight full builds.

**Rejected because:** far too expensive for a glanceable hint, and it goes against the frozen-Core rule of not rebuilding state for presentation.

### Alternative 2: Keep the pill, add the dot to the calendar only

**Description:** Minimal change.

**Pros:**

- No design-law change.

**Cons:**

- Neither problem is solved on the main surface. Stepping through time is still slow, and availability only shows once the dialog is open.

**Rejected because:** it does not answer the request.

### Alternative 3: One growing range per scroll

**Description:** Request `[stripStart, today]` every time the strip grows.

**Pros:**

- Simpler key.

**Cons:**

- Every extension refetches the whole history and gets a new cache key that the calendar cannot reuse.

**Rejected because:** fixed chunks cost the same to build and cache much better.

---

## Consequences

### Positive

- Faster temporal navigation on mobile. Athletes see where the data is before they tap.
- One shared component for all five drill-downs. Adding a sixth only needs a domain entry.

### Negative

- Availability is a proxy. A day can have a sleep row while the snapshot still returns an empty view (for example, too little history for adaptation). The dot means "raw data exists", not "a verdict exists".
- `max-lines-per-function` pressure: the selector is split into a hook, a strip, a dialog and helpers.
- `DESIGN_LANGUAGE.md` no longer has the fixed-width pill rule. Older captures in `docs/archive/` show the previous form.

### Scientific debt created

- None. Availability is descriptive, not a physiological claim.

---

## Review Criteria

- If athletes report the dot as misleading on adaptation (raw data present, no verdict), switch that domain to snapshot-backed availability for the visible chunk only.
- If `data-days` p95 exceeds 150 ms per chunk, add a composite index `(athleteId, date)` on `Activity`.
- If a drill-down stops needing temporal navigation, remove its `dataDomain` rather than forking the selector.
