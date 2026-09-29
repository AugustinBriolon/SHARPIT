# ADR-054: The scheduled sync rebuilds the athlete state only on new evidence or a new training day

**Status:** Accepted
**Date:** 2026-09-29
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A

---

## Context

The Vercel Hobby team reached 75 % of its included Fluid Active CPU (4 h a month). Active CPU
counts computation only, not time spent waiting on the database or on provider APIs. So the cost
comes from what the server computes, not from slow routes.

`/api/cron/sync` runs three times a day (06:30, 12:00, 21:00 UTC) for every athlete. After the
provider syncs, it calls `refreshAthleteState(..., { source: 'cron' })`. `shouldForceInferenceOnRefresh`
always forces inference for the `cron` source. Every run therefore recomputes the Twin inference and
regenerates the snapshot for every athlete, even when no provider brought anything back. This is
the heaviest CPU step of the cron.

The loop also covers the shared demo account (ADR-049). It has no live provider, and
`/api/cron/demo-reseed` already rebuilds it every night (ADR-026).

## Decision

1. **The demo account is left out of the scheduled sync.** `cronSyncAthleteFilter()` adds
   `clerkUserId: { not: DEMO_CLERK_USER_ID }` to the athlete query.
2. **The cron records `syncStartedAt` before the provider syncs.** After the syncs and the stream
   backfill, it asks `hasEvidenceWrittenSince(athleteId, syncStartedAt)`
   (`packages/server/src/infrastructure/athlete-state/evidence-watermark-repository.ts`). The check
   looks for any row with `updatedAt >= syncStartedAt` in the tables the provider syncs write to:
   `Activity`, `DailyHealth`, `BodyCompositionMeasurement`, `DailyNutrition` and `PlannedSession`.
   It also checks `AthleteProfile`, which carries the thresholds Garmin imports.
3. **`shouldRefreshAthleteStateAfterCronSync` makes the call.** This pure function lives in
   `packages/server/src/lib/cron/cron-state-refresh-gate.ts`. It rebuilds the state when evidence
   was written, when streams were backfilled, or when no `AthleteSnapshotRecord` exists yet for
   today's training day. A new day moves the load curves and the phase even without new data.
   Otherwise the cron skips `refreshAthleteBriefing` and marks the athlete `briefingSkippedNoChange`.
4. **The cron response reports `athletesUnchanged`.** The gain can be measured in the Vercel logs.

The in-app refresh paths (`app_shell`, `today_refresh`, provider callbacks) are unchanged.

## Options considered

### Option A — Watermark on `updatedAt` after the sync (chosen)

- **Pros:** one cheap indexed lookup per table per athlete. It does not depend on what each
  provider sync returns. It also catches writes made in the app during the sync.
- **Cons:** Prisma's `@updatedAt` moves on every upsert, even when no value changed. A provider
  that upserts the same rows each run counts as "new evidence". Any table that later starts
  feeding the state must be added to the watermark.

### Option B — Use the provider sync return values

- **Pros:** no extra query.
- **Cons:** the syncs report differently. Strava and Garmin activities return `importedTypes`, while
  Garmin health, Withings, Renpho, Google and MyFitnessPal return nothing usable. Every provider
  would need a new contract, and a provider that forgets to report would silently freeze the state.

### Option C — Run the cron less often

- **Pros:** trivial and immediate.
- **Cons:** it lowers the cost for everyone, including athletes whose data did change. Midday and
  evening activities would reach the snapshot later.

### Option D — Content fingerprint of the evidence

- **Pros:** exact, since no-op upserts do not count.
- **Cons:** hashing each athlete's recent evidence costs CPU on every run, which is what we are
  trying to save. It also adds code for a problem Option A mostly solves.

## Consequences

### Positive

- The 12:00 and 21:00 runs rebuild the state only for athletes whose providers brought something
  new. The 06:30 run still rebuilds everyone, because the training day changed.
- The demo account no longer costs three state rebuilds a day on top of its nightly reseed.
- The cron response shows `athletesUnchanged`, so the saving is visible run by run.

### Negative

- **Garmin athletes gain little for now.** `syncGarminHealth` upserts today's `DailyHealth` row
  on every run, so `updatedAt` always moves. Making that sync skip no-op upserts is a follow-up.
- A skipped athlete's widgets are not woken (`wakeAppForWidgets`). There is nothing new to show.
- A future table that feeds the athlete state must be added to `hasEvidenceWrittenSince`, or
  syncs that only write to it will not trigger a rebuild until the next training day.

### Neutral

- The Sunday weekly review keeps its own gate (`isWeeklyReviewSlot`, Pro, consents).
- Excluding inactive athletes was not done. There is no reliable "last seen" signal without a new
  column, so it would need a migration and a separate decision.

## References

- `packages/server/src/handlers/cron/sync/handler.ts`
- `packages/server/src/lib/athlete-state/orchestrator.ts` (`shouldForceInferenceOnRefresh`)
- ADR-026 (public demo mode), ADR-049 (demo is a shared Clerk account)
