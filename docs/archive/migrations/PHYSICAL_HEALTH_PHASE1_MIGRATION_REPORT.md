# Physical Health Engine — Phase 1 Migration Report

> **Migration ID:** `20260710_physical_health_engine_phase1`
> **Script:** `scripts/migrate-physical-health-phase1.ts`
> **Transforms:** `src/lib/physical-health/migrate-legacy.ts`
> **Status:** Specification + idempotent script. Legacy tables preserved.

---

## 1. Executive summary

This migration moves athlete physical health history from the legacy **Pain / Mobility / Posture** model (`PhysicalNote`, `PhysicalCheckin`) into the **Physical Health Engine** domain (`Condition`, `ConditionEpisode`, `ConditionObservation`, `FunctionalCapacity`).

**Goals:**

- Preserve 100% of historical observations
- Reconstruct timelines wherever timestamps exist
- Enable immediate benefit from historical data after migration
- Remain idempotent and reversible at the data layer (legacy tables untouched)

**Non-goals (Phase 1):**

- No deletion of legacy tables
- No UI migration
- No inference engine updates
- No `ConditionKnowledge` auto-population

---

## 2. Source inventory

| Legacy source             | Table / field                                   | Records migrated as                   |
| ------------------------- | ----------------------------------------------- | ------------------------------------- |
| Physical note             | `PhysicalNote`                                  | `Condition` + `ConditionEpisode` (#1) |
| Manual check-in           | `PhysicalCheckin`                               | `ConditionObservation`                |
| Post-session reassessment | `PlannedSession.analysis.physicalReassessments` | Observation `context = AFTER_SESSION` |
| Note title                | `PhysicalNote.title`                            | `Condition.label`                     |
| Body part                 | `PhysicalNote.bodyPart`                         | `Condition.bodyRegion`                |
| Category                  | `PhysicalNote.category`                         | `Condition.type`                      |
| Status                    | `PhysicalNote.status`                           | `Condition.status`, `Episode.status`  |
| Severity (current)        | `PhysicalNote.severity`                         | `Condition.severity` (initial seed)   |
| Description               | `PhysicalNote.description`                      | `Condition.diagnosis`                 |
| Training impact flag      | `PhysicalNote.affectsTraining`                  | `Condition.affectsTraining`           |
| Start / resolve dates     | `startDate`, `resolvedAt`                       | `Condition` + `Episode` timestamps    |
| Check-in severity         | `PhysicalCheckin.severity`                      | `observation.severityReported`        |
| Check-in comment          | `PhysicalCheckin.comment`                       | `observation.comment`                 |
| Check-in date             | `PhysicalCheckin.date`                          | `observation.observedAt`              |

---

## 3. Destination mapping

### 3.1 PhysicalNote → Condition

| Source field                | Destination field      | Transformation                                                                                       |
| --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                        | `legacyPhysicalNoteId` | Preserved (unique, idempotency key)                                                                  |
| `category`                  | `type`                 | `PAIN→PAIN`, `INJURY→INJURY`, `MOBILITY→MOBILITY_LIMITATION`, `POSTURE→POSTURE_ISSUE`, `OTHER→OTHER` |
| `bodyPart` + `title`        | `bodyRegion`           | Localized: bodyPart or title. Systemic: "Mobilité générale", "Posture générale", etc.                |
| `bodyPart` + `type`         | `scope`                | `LOCALIZED` or `SYSTEMIC` (pattern match on bodyPart)                                                |
| `title`                     | `label`                | Direct copy                                                                                          |
| `description`               | `diagnosis`            | Direct copy (free text, not a medical diagnosis claim)                                               |
| `status`                    | `status`               | `ACTIVE→ACTIVE`, `MONITORING→STABLE`, `RESOLVED→RESOLVED`                                            |
| `severity`                  | `severity`             | Current value; fallback to peak of check-ins                                                         |
| `side`                      | `side`                 | Direct copy                                                                                          |
| `affectsTraining`           | `affectsTraining`      | Direct copy                                                                                          |
| `startDate`                 | `startedAt`            | Direct copy                                                                                          |
| `resolvedAt`                | `resolvedAt`           | Direct copy                                                                                          |
| `checkins.length`           | `observationCount`     | Count                                                                                                |
| —                           | `recurrenceCount`      | **Inferred:** `0` (episode detection is Phase 2)                                                     |
| `checkins.length`           | `confidence`           | **Inferred:** 0 check-ins → 0.45, 1–2 → 0.6, ≥3 → 0.75                                               |
| `updatedAt` / last check-in | `lastObservationAt`    | **Inferred:** max(check-in dates) or `updatedAt`                                                     |

### 3.2 PhysicalNote → ConditionEpisode (#1)

| Source         | Destination         | Transformation                                            |
| -------------- | ------------------- | --------------------------------------------------------- |
| `startDate`    | `startedAt`         | Episode 1 starts with note                                |
| `resolvedAt`   | `resolvedAt`        | Same as condition                                         |
| `status`       | `status`            | Mapped like condition                                     |
| all severities | `peakSeverity`      | **Inferred:** max(note.severity, all check-in severities) |
| —              | `episodeNumber`     | Always `1` at migration                                   |
| —              | `triggerHypothesis` | `null` (Phase 4)                                          |

### 3.3 PhysicalCheckin → ConditionObservation

| Source field       | Destination field                | Transformation                                                                             |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`               | `legacyPhysicalCheckinId`        | Preserved (unique)                                                                         |
| `date`             | `observedAt`                     | Direct copy                                                                                |
| `severity`         | `severityReported`               | Direct copy                                                                                |
| `severity`         | `symptomPresent`                 | **Inferred:** `severity > 0` → true; `0` → false                                           |
| `severity`         | `functionalImpact`               | **Inferred:** heuristic bands (0→NONE, 1–3→MILD, 4–6→MODERATE, 7–8→LIMITING, 9–10→STOPPED) |
| `comment`          | `comment`                        | Direct copy                                                                                |
| note fields        | `bodyRegion`, `side`, `type`     | Copied from parent condition                                                               |
| —                  | `source`                         | `SYSTEM_MIGRATION`                                                                         |
| reassessment match | `context`                        | `AFTER_SESSION` or `MANUAL` (see §4)                                                       |
| reassessment match | `activityId`, `plannedSessionId` | Linked when post-session                                                                   |

### 3.4 PhysicalCheckin → FunctionalCapacity

Created when `severity != null`:

| Source         | Destination        | Transformation                                              |
| -------------- | ------------------ | ----------------------------------------------------------- |
| `severity`     | `painSeverity`     | Direct copy                                                 |
| `severity`     | `trainingCapacity` | **Inferred:** 0→FULL, 1–3→REDUCED, 4–6→LIMITED, 7–10→UNABLE |
| `date`         | `assessedAt`       | Same as observation                                         |
| observation id | `observationId`    | Linked                                                      |

> **Note:** Functional capacity heuristics are migration seeds only. Phase 2 engine will infer from richer signals (affectsTraining, session context, explicit functional reports).

---

## 4. Post-session reassessment classification

**Source:** `PlannedSession.analysis` JSON field:

```json
{
  "physicalReassessments": [{ "noteId": "...", "noteTitle": "..." }]
}
```

**Rule (`resolveLegacyCheckinContext`):**

A check-in is classified `AFTER_SESSION` when **all** of:

1. Session has `analyzedAt`
2. `noteId` appears in `physicalReassessments` for that session
3. `checkin.date >= analyzedAt`
4. `|checkin.date - session.date| <= 48 hours`

Otherwise: `MANUAL`.

**Preserved:** `activityId`, `plannedSessionId` from the matching session.

**Not migrated:** `noteTitle` in reassessment JSON (redundant with `Condition.label`).

---

## 5. Values discarded (with justification)

| Legacy data                    | Disposition             | Justification                                                                                |
| ------------------------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| `PhysicalNote.createdAt`       | Not stored on Condition | `startedAt` is the physiologically relevant timestamp; `createdAt` available on legacy table |
| `PhysicalCheckin.createdAt`    | Not stored              | `observedAt` (= `date`) is the evidence timestamp                                            |
| Reassessment `noteTitle`       | Not duplicated          | Already on `Condition.label`                                                                 |
| Legacy enum `PhysicalCategory` | Transformed, not stored | Replaced by `ConditionType`                                                                  |
| Legacy enum `PhysicalStatus`   | Transformed, not stored | Replaced by `ConditionStatus` / `EpisodeStatus`                                              |

**No athlete-facing data is lost.** Legacy tables remain queryable.

---

## 6. Idempotency

The migration script:

1. Loads all `Condition` rows with `legacyPhysicalNoteId`
2. Skips any `PhysicalNote` already migrated
3. Uses `legacyPhysicalCheckinId` and `externalId = legacy:checkin:{id}` to prevent duplicate observations on re-run

Safe to run multiple times.

---

## 7. Execution

```bash
# 1. Apply schema migration
yarn db:migrate:deploy

# 2. Preview transforms
tsx scripts/migrate-physical-health-phase1.ts --dry-run

# 3. Execute data migration
tsx scripts/migrate-physical-health-phase1.ts
```

---

## 8. Validation checklist

After migration, verify:

- [ ] `COUNT(PhysicalNote)` = `COUNT(Condition WHERE legacyPhysicalNoteId IS NOT NULL)`
- [ ] `COUNT(PhysicalCheckin)` = `COUNT(ConditionObservation WHERE legacyPhysicalCheckinId IS NOT NULL)`
- [ ] Every observation links to correct `conditionId` and `episodeId`
- [ ] Resolved notes have `Condition.status = RESOLVED` and `resolvedAt` preserved
- [ ] Check-ins with severity 0 have `symptomPresent = false`
- [ ] Post-session check-ins (where reassessment exists) have `context = AFTER_SESSION`
- [ ] Legacy API routes (`/api/physical-notes`) still function unchanged

---

## 9. Rollback strategy

Phase 1 rollback does **not** require dropping legacy tables.

1. Delete migrated rows: `Condition` where `legacyPhysicalNoteId IS NOT NULL` (cascades episodes, observations, capacities)
2. Legacy `PhysicalNote` / `PhysicalCheckin` data remains intact
3. Product continues using legacy paths until Phase 3

Schema rollback (drop new tables) is a separate Prisma migration if needed.

---

## 10. Example transformation

**Legacy:**

```
PhysicalNote {
  id: "note-abc"
  category: PAIN
  title: "Tendon d'Achille droit"
  bodyPart: "Achille"
  side: RIGHT
  severity: 5
  status: ACTIVE
  checkins: [
    { date: 2026-02-01, severity: 7, comment: "Après sortie longue" }
    { date: 2026-03-01, severity: 0, comment: "Rien ressenti" }
  ]
}
```

**Result:**

```
Condition {
  label: "Tendon d'Achille droit"
  bodyRegion: "Achille"
  scope: LOCALIZED
  type: PAIN
  severity: 5
  observationCount: 2
  legacyPhysicalNoteId: "note-abc"
}

ConditionEpisode { episodeNumber: 1, peakSeverity: 7 }

ConditionObservation #1 {
  severityReported: 7
  symptomPresent: true
  context: AFTER_SESSION | MANUAL
}

ConditionObservation #2 {
  severityReported: 0
  symptomPresent: false  // NOT resolution
  functionalImpact: NONE
  trainingCapacity: FULL
}
```

---

## 11. Next phase gate

**Do not proceed to Phase 2 until:**

- This report is reviewed
- Prisma migration applied successfully
- Phase 1 tests pass
- Dry-run output validated against production data sample

Phase 2 will implement `InferredConditionState` and integrate with Digital Twin / Athlete Snapshot.
