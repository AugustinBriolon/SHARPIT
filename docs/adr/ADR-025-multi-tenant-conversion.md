# ADR-025: Multi-tenant conversion — Phase 0 (foundation)

**Status:** Accepted
**Date:** 2026-08-24
**Author:** Principal Architect
**Supersedes:** N/A
**Superseded by:** N/A

---

## Context

SHARPIT was built, and has run to date, for exactly one athlete. Nothing in the schema disagreed with that: `AthleteProfile` and every integration-account table use a literal `id: 'default'` singleton row, and the ~19 tables that hold the athlete's actual training and health data — `Activity`, `DailyNutrition`, `Goal`, `PlannedSession`, `TrainingPlan`, and others — carry no owner column at all. Clerk sits in front of the app as a pure login gate: `auth.protect()` in `src/proxy.ts` checks "is there a session," never reads `auth().userId`, and the only place a Clerk user id touches anything today is a client-side IndexedDB cache key (`src/lib/pwa/snapshot-store.ts`). An email allow-list (`ALLOWED_EMAILS`, `src/lib/auth.ts`) is the actual single-tenant enforcement point.

The owner wants to open SHARPIT to other people. This surfaced mid-session while scoping an unrelated "demo mode" feature: a demo visitor browsing fake data turned out to be unsafe to build on the current model, because there is no tenant boundary to protect the real athlete's data behind. Three Explore agents and one Plan agent mapped the actual codebase before any schema change — the numbers below are measured, not estimated.

This ADR covers **Phase 0 only**: the schema and a tenant-resolution helper, with no behavior change for the existing athlete and no sign-ups opened. It does not sweep the application code to actually use per-request tenant resolution (Phase 1), and it does not touch `ALLOWED_EMAILS` or onboarding (Phase 2). Both are described briefly under Roadmap.

---

## Decision

### 1. `AthleteProfile` becomes the tenant root — not a separate `Athlete` table

`AthleteProfile` gains `clerkUserId String @unique`; its `id` switches from `@default("default")` to `@default(cuid())`. It stays the FK target every other table points to — it was already the cascade target of `AthleteThresholdSnapshot`, and seven Core/Inference tables (`Observation`, `FeatureSet`, `DigitalTwin`, `EnvironmentalObservationRecord`, `DecisionRecord`, `CoachingDecision`, `AthleteSnapshotRecord`) already carried a loose, unconstrained `athleteId` column populated only with `'default'` — this decision makes that column's meaning literal instead of coincidental.

A separate lean `Athlete{id, clerkUserId}` table was considered and rejected: it would not reduce the number of tables needing an FK to _something_, and would additionally require rewiring `AthleteThresholdSnapshot`'s existing relation and adding a new 1:1 join, for no behavioral gain. Nothing in this product needs more than one profile per identity. If that changes later, splitting `Athlete` out is a mechanical follow-up migration, not a foreclosed option.

Every domain field on `AthleteProfile` (thresholds, equipment, sleep targets, home location) was already nullable, so a freshly-created `{id, clerkUserId}` row is already a legally complete "empty" profile — no further schema change was needed for that.

### 2. Every table gains its `athleteId` by measured cascade shape, not by a fixed list

Rather than adding a column to every table wholesale, each table was checked against one rule: **a table needs its own `athleteId` unless it cascade-deletes from a parent that already has one, through a required (non-nullable) foreign key.** Applying that rule precisely changed the scope in two directions from the initial estimate:

- `PhysicalCheckin` and `ConditionKnowledge` were dropped from the "add a column" list — both have a required, `onDelete: Cascade` parent (`PhysicalNote`, `Condition`) and inherit tenant scoping transitively. Giving them their own column would have been redundant.
- `ConditionObservation` was added to the list despite initially looking like a child — every one of its relations (`conditionId`, `episodeId`, `activityId`, `plannedSessionId`) is optional with `onDelete: SetNull`, so a row can legitimately have all four null. It does not reliably inherit a tenant from anything and needs its own column.

The result: 17 tables gained a new `athleteId String @default("default")` + index + FK; 7 Core/Inference tables (already carrying the column) gained the FK only; 6 integration-account tables (`GarminAccount`, `StravaAccount`, `GoogleAccount`, `RenphoAccount`, `WithingsAccount`, `MyFitnessPalAccount`) had their singleton `id` **renamed** to `athleteId` and promoted to the tenant FK, since one connected account per provider per athlete is exactly a 1:1 key — no separate surrogate id was introduced. `StravaAccount` already had an unrelated field named `athleteId` (Strava's own external athlete id) — renamed to `stravaAthleteId` first, in the same migration, to free the name.

### 3. Backfill via a constant column default, migration hand-written from Prisma's own diff

Because the existing athlete's `AthleteProfile.id` is already the literal string `'default'` in production, a SQL-level `@default("default")` on every new `athleteId` column backfills every existing row to point at the correct, real tenant automatically — Postgres treats `ALTER TABLE ... ADD COLUMN col TEXT NOT NULL DEFAULT 'default'` as metadata-only when the default is a constant, no table rewrite, no manual per-row `UPDATE` needed.

Two things Prisma's own auto-generated migration diff got wrong, both hand-corrected before applying:

- The 6 integration-account renames were generated as `DROP COLUMN "id"` + `ADD COLUMN "athleteId" TEXT NOT NULL` — destructive on any table with an existing row (and, for `StravaAccount`, referencing a PK column the diff never actually created). Replaced with plain `ALTER TABLE ... RENAME COLUMN "id" TO "athleteId"`, which Postgres treats as metadata-only and which correctly carries the existing PK constraint through the rename.
- `AthleteProfile.clerkUserId` was generated as `ADD COLUMN "clerkUserId" TEXT NOT NULL` — impossible on the existing row with no value to backfill from (this is genuinely new information: _which_ Clerk identity owns the existing data). Corrected to add it nullable, backfill the one existing row by hand with the owner's real Clerk user id, then tighten to `NOT NULL UNIQUE`. This is the only manual data step in the whole migration.

`@default("default")` on the 17 new columns is a bootstrap convenience, not a permanent guarantee — left in place, it would silently assign any write path that forgets to pass `athleteId` to the _original_ athlete, a real cross-tenant leakage class of bug. Dropping it (keeping `NOT NULL`) is a **Phase 1 exit criterion**, once every write path is confirmed to pass a real value explicitly.

### 4. Three unique constraints were global and would have broken on a second tenant — fixed in the same pass

Auditing every `@unique`/`@@unique` in the schema surfaced three that assumed a single athlete and were not on this ADR's initial list, because they are correctness bugs rather than missing-column gaps:

- `DailyHealth.date @unique`, `DailyBriefing.date @unique`, `WeeklyReview.weekStart @unique` — each a bare unique on a date, meaning two different athletes could never both have an entry for the same calendar day. Each became `@@unique([athleteId, date])` (or `weekStart`).
- `DailyNutrition.@@unique([date, provider])` and `.externalId @unique` — same issue for the daily nutrition log and its MyFitnessPal dedup key; scoped to `@@unique([athleteId, date, provider])` and `@@unique([athleteId, externalId])`.
- `BodyCompositionMeasurement.@@unique([source, externalId])` — a Renpho/Withings measurement id is not confirmed globally unique across every account of those providers; scoping to `@@unique([athleteId, source, externalId])` cannot make a genuinely-unique value less correct, and protects against the case where it isn't.
- `PerformanceRecord.@@unique([category, rank])` — a global top-5 leaderboard per category, which would have let one athlete's personal record silently overwrite another's. Scoped to `@@unique([athleteId, category, rank])`.

Left alone, deliberately: `Activity.stravaId`/`garminId`, `PlannedSession.googleEventId` — external provider ids that are globally unique in the _provider's_ id space, not just within one connected account, so no change was needed. `GoalAchievement.@@unique([goalId, periodKey])` and `ConditionEpisode.@@unique([conditionId, episodeNumber])` were also left alone: `goalId`/`conditionId` already point at a single, tenant-scoped parent row, so the composite key is safe transitively.

### 5. `getCurrentAthleteId()` — written, not yet wired into any route

`src/lib/auth/current-athlete.ts` resolves the signed-in Clerk user to their `AthleteProfile.id`, following the same `cache()`-per-request pattern `getAthleteProfile` already uses (`src/lib/queries/index.ts`): `findUnique` before `create` (so an existing athlete's every request doesn't bump `updatedAt`), and a lazy `create`-on-first-request in place of a `user.created` webhook — none exists (no `svix` dependency), and Clerk's `userId` is stable and idempotent per user, so this is a reasonable substitute for this phase. A concurrent double-create from two racing first-requests is caught (`PrismaClientKnownRequestError` code `P2002`) and resolved by reading back the row the winner just inserted, matching the existing `P2002`-catching convention already used in `strava-sync.ts`/`garmin-activity-sync.ts`.

This helper has exactly one caller in this phase: its own test suite. No route, page, or query file was changed to call it — that sweep is Phase 1.

### 6. Compiling required a mechanical, behavior-preserving fix at every renamed/re-shaped call site

Renaming a PK or re-shaping a unique constraint breaks TypeScript at every call site that references the old shape, regardless of whether runtime behavior changes — Prisma's generated types enforce this at compile time. Roughly 20 files (`src/lib/integrations/**`, `src/lib/athlete-state/freshness-service.ts`, `src/lib/briefing/daily-briefing.ts`, `src/lib/weekly-review.ts`, `src/lib/engines/recovery-engine.ts`, `src/lib/today/today-state-server.ts`, the Strava/Google/Withings OAuth callback routes, two test fixtures) were updated to use the new field names and composite `where` keys, every one hardcoded to the literal `'default'` — or, where a real `athleteId` parameter was already in scope (`src/app/api/daily-strain/route.ts`, `today-state-server.ts`, `freshness-service.ts`), wired to that instead of a fresh literal. This is schema-consistency work, not Phase 1's tenant-resolution sweep: nothing here calls `getCurrentAthleteId()` or changes what data any request returns.

Two `upsert`s could no longer type-check their `create` branch at all, for the same reason: `upsertAthleteProfile` (`src/lib/queries/index.ts`) and a Garmin-threshold-import upsert (`src/lib/integrations/garmin/garmin-sync.ts`) both upserted `AthleteProfile` by `id: 'default'` with a `create` branch that can no longer synthesize a `clerkUserId`. Both became plain `update`s — the migration guarantees the row already exists before either can run, so the `create` branch was already dead code; this is honest about that rather than inventing a placeholder identity value.

---

## Options considered

### Option A — Separate `Athlete{id, clerkUserId}` table

See Decision 1. Rejected: no blast-radius reduction, extra join, no product need for it yet.

### Option B — Skip the "cascade vs. own column" analysis, add `athleteId` to every table on the initial list

**Pros:** Faster to write, no per-table judgment calls.
**Cons:** Would have added two redundant columns (`PhysicalCheckin`, `ConditionKnowledge`) that could silently drift from their parent's real tenant, and missed `ConditionObservation`'s genuine gap — a table whose rows can be tenant-orphaned by design (`SetNull` on every relation).
**Rejected because:** correctness here is cheap to get right at migration time and expensive to discover later as a data-integrity bug.

### Option C — Leave the three unique-constraint bugs (§4) for Phase 1

**Pros:** Keeps Phase 0 strictly to "add columns," smaller diff.
**Cons:** These are not additive changes like the rest of Phase 0 — they are constraints that are _currently wrong_ for any world with more than one athlete, sitting untouched in a schema Phase 1 assumes is already tenant-safe. Deferring them risks a second migration touching the same tables, or worse, someone relying on the (wrong) global uniqueness in application code written during Phase 1.
**Rejected because:** they were already in the schema files this ADR was touching; fixing them here cost nothing beyond noticing them.

### Option D — Split into two separate migrations (columns-with-default, then FK-add), as originally planned

**Pros:** Lets a nervous operator verify the column-only state before committing to constraints.
**Cons:** Postgres already performs the constant-default `ADD COLUMN` as one atomic, metadata-only operation — splitting it into two migrations added no real safety, only two files to keep in sync.
**Rejected because:** the single generated-and-corrected migration (`prisma migrate diff` against the schema, hand-fixed for the two unsafe spots) was reviewed in full before applying; a second file would have reviewed the same SQL twice for no additional guarantee.

---

## Consequences

### Positive

- The existing athlete's app behavior is unchanged — same `'default'` values flow through the same call sites, now through explicit tenant-scoped columns and composite keys instead of implicit singletons.
- Three real, pre-existing correctness gaps (§4) are closed as a side effect of doing this work carefully, not deferred as separate bugs.
- `getCurrentAthleteId()` exists, is unit-tested (existing-user, lazy-provision, and race-recovery paths), and is ready for Phase 1 to wire in — without Phase 1 needing to design it from scratch.
- The Core/Inference layer (`docs/models/CORE_ARCHITECTURE.md`, frozen) needed zero engine or signature changes: the seven Core tables already took `athleteId` as a parameter everywhere it mattered (`src/core/inference/*`); this ADR only added the FK constraint their existing column always implied. Nothing here is a new engine, a new decision path, or a change to what any engine computes — it satisfies engineering principle #5 ("no new core engine") by construction, not by argument.

### Negative

- `AthleteProfile` now declares roughly 30 back-relation array/optional fields (one per tenant-scoped table), because Prisma requires both sides of a relation to be declared explicitly — confirmed empirically against this project's pinned Prisma 6.19.3 before writing them, rather than assumed. This makes `AthleteProfile` the largest single model in the schema by field count, though every added field is a one-line back-relation, grouped and commented by category.
- `@default("default")` on the 17 new columns is a real, if temporary, footgun: a Phase 1 write path that forgets to pass `athleteId` fails silently into the original athlete's tenant rather than erroring. This is why dropping the default is named explicitly as a Phase 1 exit criterion rather than left implicit.
- Roughly 20 files now carry a hardcoded `'default'` at a call site that previously didn't need to think about tenancy at all (because the field didn't exist). This is deliberate — Phase 0 stops at "compiles and behaves identically" — but it does mean Phase 1's sweep has slightly more surface area to touch than if this ADR had left those files broken and out of scope.

### Neutral

- The migration SQL (`prisma/migrations/20260824_multi_tenant_phase_0/migration.sql`) is hand-corrected from Prisma's auto-generated diff rather than accepted as generated — two of its statements would have been actively destructive or non-functional as generated. Future contributors reading this migration file should not assume every future auto-generated diff can be applied unreviewed; this one specifically could not.

---

## Roadmap

- **Phase 1 — done**: swept every route/RSC boundary that carried a hardcoded `ATHLETE_ID`/`PROFILE_ID`/`ACCOUNT_ID` constant or a literal `'default'` introduced by Phase 0's compile-fix pass, threading `getCurrentAthleteId()` in once at each boundary — never inside a pure presentation builder (extends ADR-007's "no I/O in builders" one hop further upstream). The OAuth/connect callback routes now upsert on the resolved `athleteId` instead of `'default'`. `POST /api/cron/sync` loops every `AthleteProfile` with bounded concurrency (`mapWithConcurrency`, already in `src/lib/integrations/garmin/garmin-sync.ts`).
- **Phase 1 — still outstanding**: `GET /api/cron/planned-forecast` (`src/app/api/cron/planned-forecast/route.ts`) still calls `refreshUpcomingPlannedSessionForecasts()` with no athlete loop — needs the same multi-athlete sweep as `cron/sync` before a second tenant's forecasts would refresh. Dropping the `@default("default")` bootstrap on the 17 columns is still deferred to its own migration, once a final audit confirms every write path passes `athleteId` explicitly.
- **Phase 2 — done (allow-list + first-login onboarding)**: `ALLOWED_EMAILS` / `AccessGate` retired (Clerk `auth.protect()` alone). Forced `/onboarding` wizard (`AthleteProfile.onboardingCompletedAt`) covers intention (race | metric | later) + optional providers. Still open: per-athlete AI/coach cost accounting before broad invite (`src/lib/ai.ts` tags spend by feature only via one shared `AI_GATEWAY_API_KEY`). Demo mode shipped separately as ADR-026.

## Explicitly deferred, not forgotten

Billing, per-athlete AI usage limits, webhook infrastructure (Clerk `user.created` or provider webhooks — lazy provisioning substitutes for this in Phase 0/1), database-level tenant isolation via RLS (staying with application-level `where: { athleteId }` filtering, consistent with this codebase's all-Prisma convention), and a cron fan-out/dispatcher architecture for scaling past Vercel's `maxDuration` ceiling as tenant count grows.

---

## References

- `docs/models/CORE_ARCHITECTURE.md` — "Phase: Stabilization... not horizontal growth (new engines)" and engineering principle #5, both satisfied by construction (see Consequences).
- `docs/adr/ADR-007-coaching-explainability-presentation.md` — the I/O-boundary convention this ADR's Phase 1 plan extends.
- `prisma/schema.prisma`, `prisma/migrations/20260824_multi_tenant_phase_0/migration.sql` — implementation.
- `src/lib/auth/current-athlete.ts`, `src/lib/auth/current-athlete.test.ts` — `getCurrentAthleteId()`.
- Allow-list (`ALLOWED_EMAILS` / `AccessGate`) removed — tenant access is Clerk session + `getCurrentAthleteId()` lazy provision.
- First-login onboarding: `src/app/onboarding/`, `src/lib/onboarding/`, `OnboardingGate` in `(app)/layout`.
