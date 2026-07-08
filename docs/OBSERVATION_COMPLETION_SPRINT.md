# Observation Completion Sprint

## Scope implemented

This sprint connects observations that already existed in SHARPIT to the canonical pipeline:

`Provider/Product flow -> RawObservation -> ObservationEngine -> FeatureEngine -> existing models -> Athlete Snapshot -> Today surfaces`

No new physiological model was introduced. The work only improves observation completeness and replaces avoidable fallbacks with direct inputs.

## Waves delivered

### Wave 1 — Critical gaps

- Manual activities now produce canonical `SESSION` observations while keeping legacy `Activity` persistence for UI compatibility.
- Manual activity `rpe`, `feeling`, and `notes` now produce linked `SUBJECTIVE` observations through `sessionExternalId`.
- `PhysicalNote` and `PhysicalCheckin` now produce canonical `PHYSICAL_CONDITION` observations.
- Manual updates and deletions now re-sync or remove their canonical observations to prevent legacy/canonical drift.

### Wave 2 — Existing but disconnected data

- Cached Garmin/Strava streams now feed `SessionFeatureSet` fields that were previously left `null`:
  - `timeInZones`
  - `aerobicLoadFactor`
  - `anaerobicLoadFactor`
  - `hrDriftPercent`
  - `paceVariabilityIndex`
- Withings body measurements now propagate `waterPercent` and `visceralFat` into canonical `BODY_COMPOSITION` observations, which then populate `BODY` features.

### Wave 3 — Existing domain fields without producers

- Morning wellness check-in now produces:
  - `SUBJECTIVE.stressLevel`
  - `SUBJECTIVE.notes`
- Existing physical flows now fully populate canonical fields already defined in the domain:
  - `PHYSICAL_CONDITION.category`
  - `PHYSICAL_CONDITION.bodyRegion`
  - `PHYSICAL_CONDITION.bodySide`
  - `PHYSICAL_CONDITION.severity`
  - `PHYSICAL_CONDITION.conditionId`
  - `PHYSICAL_CONDITION.affectsTraining`

### Wave 4 — Heuristic replacement

- Manual session RPE now upgrades manual-session stress estimation from `DURATION_FACTOR` fallback to `RPE_BASED` whenever direct subjective input exists.
- Cached streams now replace `null` placeholders for stream-dependent session features.
- Direct physical-condition observations now replace looser contextual approximations for training limitation.
- Direct Withings fields now replace partial body-composition payloads.

## Domain completeness matrix

| Field                                          | Existing producer           | Previous gap                                  | Connection implemented                                    |
| ---------------------------------------------- | --------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `SESSION` from manual activity                 | `POST /api/activities`      | Stayed in legacy `Activity` only              | `Activity` now syncs into canonical `SESSION` observation |
| `SUBJECTIVE.rpe` from manual activity          | Activity form               | Not canonical for manual sessions             | Linked `SUBJECTIVE` observation per manual session        |
| `SUBJECTIVE.mood` from manual activity feeling | Activity form               | Feeling stayed as free text in `Activity`     | Feeling mapped to canonical 1-5 mood scale                |
| `SUBJECTIVE.notes` from manual session         | Activity form               | Not exported to observation layer             | Included in session-linked subjective observation         |
| `SUBJECTIVE.stressLevel`                       | Morning wellness dialog     | Domain field existed without producer         | Added to existing wellness flow                           |
| `SUBJECTIVE.notes` (morning)                   | Morning wellness dialog     | Domain field existed without producer         | Added optional free-text context to existing flow         |
| `PHYSICAL_CONDITION.conditionId`               | Physical note + check-in    | Legacy records only                           | Condition sync preserves stable canonical linkage         |
| `PHYSICAL_CONDITION.bodySide=NA`               | Physical note dialog        | Product enum existed but core type missed it  | Canonical type aligned and producer connected             |
| `PHYSICAL_CONDITION.category=OTHER`            | Physical note dialog        | Product enum existed but core type missed it  | Canonical type aligned and producer connected             |
| `BODY_COMPOSITION.waterPercent` from Withings  | Withings sync               | Stored upstream but not mapped to observation | Withings adapter now maps it                              |
| `BODY_COMPOSITION.visceralFat` from Withings   | Withings sync               | Stored upstream but not mapped to observation | Withings adapter now maps it                              |
| `SessionFeatureSet.timeInZones`                | Garmin/Strava streams cache | Cached but not consumed by FeatureEngine      | Added stream provider to session extraction               |
| `SessionFeatureSet.aerobicLoadFactor`          | Garmin/Strava streams cache | Cached but not consumed by FeatureEngine      | Added stream provider to session extraction               |
| `SessionFeatureSet.anaerobicLoadFactor`        | Garmin/Strava streams cache | Cached but not consumed by FeatureEngine      | Added stream provider to session extraction               |
| `SessionFeatureSet.hrDriftPercent`             | Garmin/Strava streams cache | Cached but not consumed by FeatureEngine      | Added stream provider to session extraction               |
| `SessionFeatureSet.paceVariabilityIndex`       | Garmin/Strava streams cache | Cached but not consumed by FeatureEngine      | Added stream provider to session extraction               |

## Traceability report

### 1. Manual activity

- Provider: Product flow `Activity` form
- Raw/product source: `POST/PATCH /api/activities`
- Canonical observation: `SESSION`
- Adapter / ingestion path: `src/lib/manual-observation-sync.ts` -> `observationEngine.ingest()`
- Features populated: `SessionFeatureSet` core load metrics (`tssScore`, `tssMethod`, `intensityFactor`, `mechanicalLoad`, `elevationStressScore`, `efficiencyFactor`)
- Existing models consuming those features:
  - `fatigue-v1`
  - `recovery-synthesis-v1`
  - `adaptation-v1`
  - `daily-strain` aggregation
- Digital Twin fields impacted:
  - effort / daily strain inputs
  - load history
  - recovery context
  - adaptation context
- Snapshot / Today projections:
  - `AthleteSnapshot.effort`
  - `AthleteSnapshot.recovery`
  - `AthleteSnapshot.adaptation`
  - daily phase session context
- Visible product surfaces:
  - Today Effort ring and drill-down
  - Today Recovery ring and drill-down
  - Today Adaptation ring and drill-down
  - session summaries that depend on the snapshot

### 2. Manual session RPE / feeling / notes

- Provider: Product flow `Activity` form
- Raw/product source: `Activity.rpe`, `Activity.feeling`, `Activity.notes`
- Canonical observation: `SUBJECTIVE` linked by `sessionExternalId`
- Adapter / ingestion path: `src/lib/manual-observation-sync.ts` -> `observationEngine.ingest()`
- Features populated:
  - `SessionFeatureSet.subjectiveRpe`
  - `RecoveryFeatureSet.rpeVsTargetZone`
  - `RecoveryFeatureSet.subjectiveWellnessComponents.mood` when mapped from feeling
- Existing models consuming those features:
  - `fatigue-v1`
  - `recovery-synthesis-v1`
  - manual-session TSS path through `RPE_BASED`
- Digital Twin fields impacted:
  - effort confidence on manual sessions
  - recovery subjective dimension
  - fatigue interpretation
- Snapshot / Today projections:
  - recovery narrative
  - effort narrative when manual session is the main load source
- Visible product surfaces:
  - Today Recovery ring and drill-down
  - Today Effort ring and drill-down
  - narrative / briefing surfaces using recovery and fatigue context

### 3. Morning wellness stress and notes

- Provider: Existing morning wellness dialog
- Raw/product source: `POST /api/wellness-checkin`
- Canonical observation: `SUBJECTIVE`
- Adapter / ingestion path: `src/lib/wellness-checkin.ts` -> `observationEngine.ingest()`
- Features populated:
  - `RecoveryFeatureSet.subjectiveWellnessComponents`
  - raw canonical storage for `stressLevel` and `notes`
- Existing models consuming those features:
  - `recovery-synthesis-v1` for mood / energy / soreness
  - `fatigue-v1` for subjective wellness
  - `stressLevel` and `notes` are now canonical but not yet consumed by a model
- Digital Twin fields impacted:
  - recovery subjective readiness
  - fatigue psychological dimension
- Snapshot / Today projections:
  - recovery and fatigue projections in `AthleteSnapshot`
- Visible product surfaces:
  - Today Recovery ring and drill-down
  - narrative / briefing surfaces influenced by subjective wellness

### 4. Physical notes / injuries / pain

- Provider: Existing physical note and check-in flows
- Raw/product source:
  - `POST/PATCH /api/physical-notes`
  - `POST /api/physical-notes/[id]/checkins`
- Canonical observation: `PHYSICAL_CONDITION`
- Adapter / ingestion path: `src/lib/manual-observation-sync.ts` -> `observationEngine.ingest()`
- Features populated:
  - `ConditionFeatureSet.activeConditionCount`
  - `ConditionFeatureSet.maxActiveSeverity`
  - `ConditionFeatureSet.trainingBlockedByCondition`
  - `ConditionFeatureSet.conditionTrend`
- Existing models consuming those features:
  - `fatigue-v1`
- Digital Twin fields impacted:
  - limitation / blocking-condition context
  - capacity reduction context
- Snapshot / Today projections:
  - `AthleteSnapshot.reasoning`
  - limiting-factor and caution messaging
- Visible product surfaces:
  - Today limiting-factor / trust / narrative strips
  - Physical screen
  - downstream recovery / fatigue narratives

### 5. Garmin / Strava cached streams

- Provider: Garmin / Strava integrations
- Raw/product source: `ActivityStream.data`
- Canonical observation: none added; existing `SESSION` observations are enriched at feature extraction time from already cached stream payloads
- Adapter / ingestion path: `PrismaSessionStreamProvider` -> `FeatureEngine.computeSessionFeatures()`
- Features populated:
  - `SessionFeatureSet.timeInZones`
  - `SessionFeatureSet.aerobicLoadFactor`
  - `SessionFeatureSet.anaerobicLoadFactor`
  - `SessionFeatureSet.hrDriftPercent`
  - `SessionFeatureSet.paceVariabilityIndex`
- Existing models consuming those features:
  - none directly today for the new fields
  - but the feature layer is now continuous and ready for current consumers of `DayFeatures`
- Digital Twin fields impacted:
  - immediate model impact is limited today
  - removes missing-data dead ends for session physiology
- Snapshot / Today projections:
  - no direct surface yet for all fields, but they are now available through canonical features
- Visible product surfaces:
  - future-ready for Today session drill-downs and athlete analysis surfaces

### 6. Withings body composition enrichments

- Provider: Withings integration
- Raw/product source: Withings measures payload
- Canonical observation: `BODY_COMPOSITION`
- Adapter / ingestion path: `src/core/adapters/withings-adapter.ts` -> observation pipeline
- Features populated:
  - `BodyFeatureSet.waterPercent`
  - `BodyFeatureSet.visceralFat`
- Existing models consuming those features:
  - no current inference model consumes these fields directly
- Digital Twin fields impacted:
  - body-composition continuity, ready for present and future body surfaces
- Snapshot / Today projections:
  - not projected on Today yet
- Visible product surfaces:
  - body/composition surfaces

## Verification completed

- TypeScript: `npx tsc --noEmit`
- Unit tests:
  - `npx vitest run src/core/features/extractors/__tests__/session-extractor.test.ts`
  - `npx vitest run src/core/features/extractors/__tests__/recovery-extractor.test.ts`
  - `npx vitest run src/core/features/extractors/__tests__/body-extractor.test.ts`
  - `npx vitest run src/core/features/extractors/__tests__/condition-extractor.test.ts`
  - `npx vitest run src/core/adapters/garmin-activity-adapter.test.ts`

## Remaining intentionally out of scope

- No new inference logic for `stressLevel`, free-text notes, or enriched stream/body fields.
- No new Today surfaces were introduced for the newly continuous but not-yet-rendered feature fields.
- No new observation types were added beyond the existing domain model.
