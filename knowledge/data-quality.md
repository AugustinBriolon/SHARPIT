# Data Quality

> How SHARPIT handles imperfect, missing, and contradictory data. The rules that govern data ingestion, storage, and use.

---

## Data Quality Philosophy

SHARPIT's recommendations are only as good as the data they're built on. The system must:

1. Ingest what is available
2. Mark what is uncertain or missing
3. Degrade recommendations when data quality is insufficient
4. Never fabricate values to fill gaps

**The failure mode to avoid:** silently proceeding with bad data and producing confident-seeming outputs. This is worse than showing a gap because it creates trust in a recommendation that isn't supported.

---

## Data Sources and Their Quality Profiles

### Garmin Activity Data

**Reliability:** high for structured data (duration, distance, HR). Medium for derived data (TSS, VO2max).

**Common quality issues:**

- **Indoor activities**: no GPS; distance from accelerometer/cadence sensor — less accurate
- **Open-water swimming**: GPS tracking is imprecise
- **Activity type misclassification**: Garmin may auto-detect "Cycling" when the user did a spin class on a stationary bike
- **Duplicate activities**: auto-sync + manual import can create duplicates
- **Partial syncs**: if the watch runs out of battery mid-session, data is truncated

**SHARPIT handling:**

- Store raw imported values; don't modify
- Activity deduplication by start time + device ID
- Truncated activities: use available data; no extrapolation
- Misclassified types: user can override; training plan assignment depends on type

### Garmin Health Metrics (daily)

**Reliability:** medium. Garmin's algorithms change via firmware; historical data is not retroactively recomputed.

**Common quality issues:**

- **Missing sleep data**: watch not worn, watch not synced in morning, battery died
- **HRV gaps**: requires sleep with continuous HR measurement; gaps if watch removed at night
- **Readiness not computed**: Garmin requires consistent data; day 1 often shows no readiness
- **Body battery reset**: after long sync gaps, body battery resets to arbitrary value

**SHARPIT handling:**

- Missing daily health data: stored as `null`, not zero — critical distinction for trend analysis
- Gaps in HRV: excluded from trend computation; window shifts to exclude gap days
- Body battery reset artifacts: current implementation does not detect these

### Body Composition Data (Renpho/Garmin Scale)

**Reliability:** weight: high. Body composition percentages: low-medium (BIA accuracy).

**Common quality issues:**

- **Hydration variation**: BIA readings vary ±2-3% body fat based on hydration
- **Meal timing**: measurements differ pre and post-meal
- **Device calibration drift**: scales may drift over months
- **Measurement frequency gaps**: irregular weighing produces noisy trends

**SHARPIT handling:**

- Store all measurements; no filtering
- Trend analysis benefits from consistent measurement conditions (same time of day, same hydration state)
- This guidance should appear in onboarding

---

## Missing Data Handling Rules

### Rule 1: Null vs. Zero

`null` means "no data." `0` means "zero value." These are never interchangeable.

**Violations to prevent:**

- `hrv = 0` when the watch wasn't worn → should be `hrv = null`
- `load = 0` for rest day → `0` is correct (rest day has zero load)
- `sleepScore = 0` when no sleep recorded → should be `null`

A `0` in a moving average calculation produces incorrect results. A `null` should be excluded from the window.

**Implementation requirement:** all time-series calculations (HRV trend, RHR trend, sleep average) must skip null values rather than treating them as zero.

### Rule 2: Minimum Window Enforcement

When a calculation requires N days of data, it must not fire if fewer than N non-null values exist within the window.

**Current violations:**

- ACWR can compute with very few data points (mathematically, not minimum-enforced)
- HRV trend fires without checking window completeness

**Required behavior:** see `confidence-scoring.md` for minimum data requirements per output.

### Rule 3: Gap Detection

When a user has consecutive missing data days (e.g., watch not synced for 5 days), SHARPIT should:

- Detect the gap
- Not use pre-gap data as if it is recent
- Show "Données non récentes" prominently
- Disable stale-data-dependent recommendations

**What counts as a gap:** no activity data AND no health data for >48 hours.

---

## Data Integrity Rules

### Load Unit Constraint

**Rule:** all `Activity.load` and `PlannedSession.load` values must be TSS equivalents. No other unit.

**Rationale:** PMC and ACWR computations treat all load values as TSS. Mixed units (e.g., RPE×10 for strength sessions, TSS for cycling) corrupt the models.

**Enforcement:** this is a domain constraint, not a database constraint. Zod validators on the API layer must validate that load values are within plausible TSS ranges. Suspiciously high values (>500 for a single session) should trigger validation error, not silent acceptance.

### Timestamp Integrity

**Rule:** all timestamps stored in UTC. Display conversion to athlete's local timezone happens at render time, never at storage time.

**Rationale:** sleep analysis depends on local time (bedtime and wake time are local-time concepts). Storing local time would require knowing the timezone at storage time and would break if the athlete travels.

**Implementation:** Prisma stores `DateTime` (UTC). Display layer uses athlete's `timezone` from `AthleteProfile`.

### Historical Data Immutability

**Rule:** imported Garmin data is immutable after import. SHARPIT stores what Garmin reported, not processed versions.

**Rationale:** if SHARPIT's algorithms change, raw data can be reprocessed. Processed data that replaced the original is irrecoverable.

**Exception:** user overrides (manually corrected activity types, manually entered FTP) are stored separately from imported data, not replacing it.

---

## Data Validation

### At Import (Garmin Sync)

Validate:

- Required fields present (activity ID, start time, duration)
- Duration > 0
- HR values within physiological range (30-250 bpm)
- Power values within physiological range (0-3000W for cycling)
- GPS coordinates within valid range (if present)
- TSS value within plausible range (0-500 per session)

Reject (log and skip, don't crash):

- Activities with implausible values
- Activities older than a defined import window
- Duplicate activity IDs

### At API Layer (User Input)

All user-facing API endpoints use Zod validators in `src/lib/validators/`. Rules:

- Numeric fields: bounded ranges matching physiological plausibility
- String fields: max length enforced
- Dates: must be valid ISO 8601; must not be in future (for completed activities)
- Enum fields: use Prisma/Zod enum types, not raw strings

### At Computation Time

Before running any analysis function:

- Check minimum data requirements
- Return early with `null` or confidence-flagged result when requirements not met
- Never throw; return degraded output with metadata

---

## The Single-User Assumption

SHARPIT's entire data model assumes one athlete. The `AthleteProfile` is a singleton (`id="default"`). All data is implicitly scoped to this athlete.

**Data quality implication:** there is no isolation between "my data" and "another user's data" because there is only one user. The auth layer (Clerk email allowlist) enforces this at access control. Data quality issues around multi-user contamination do not apply.

---

## Known Data Quality Gaps

| Gap                                                       | Impact | Priority                                         |
| --------------------------------------------------------- | ------ | ------------------------------------------------ |
| ACWR fires with insufficient history                      | High   | Can produce misleading injury risk alerts        |
| Null vs. zero not consistently enforced in trend analysis | High   | Can distort HRV and RHR baselines                |
| No gap detection for stale data                           | Medium | Stale recommendations without warning            |
| Duplicate activity detection is incomplete                | Medium | Inflated load metrics                            |
| Body battery reset artifacts not detected                 | Low    | Occasional misleading body battery drops         |
| Strength session TSS plausibility check absent            | Low    | Extremely high duration would produce absurd TSS |
| Local timezone for sleep analysis not fully verified      | Medium | Bedtime regularity could be computed in UTC      |
