# Environmental Context Engine — Pre-Phase 2 Boundary Review

> **Status:** Decision document — Twin integration blocked pending approval  
> **Date:** 2026-07-10  
> **Prior contract:** `environment-v1` (Phase 1.5 frozen)  
> **Related:** [`ENVIRONMENTAL_CONTEXT_ENGINE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE.md), [`DOMAIN.md`](../domain/DOMAIN.md), [`PHYSICAL_HEALTH_ENGINE.md`](./PHYSICAL_HEALTH_ENGINE.md)

---

## Executive summary

The `environment-v1` contract successfully separates **evidence** (immutable records), **context** (temporal intent), and **applicability**. However, the current public type `EnvironmentalImpact` **conflates two distinct responsibilities** that SHARPIT's domain model already treats separately elsewhere:

| Responsibility               | Question it answers                                                   | Analog in Physical Health Engine                     |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| **Environmental Stress**     | What physiological load does the environment impose?                  | `PhysicalHealthSignals`                              |
| **Environmental Impact**     | How should existing physiological models adjust their interpretation? | `PhysicalHealthDecision` + capacity modifiers        |
| **Environmental Correction** | How should raw performance be _explained_ in context?                 | Coach narrative / activity analysis (not Twin state) |

**Recommendation: Decision 4 — Introduce both `EnvironmentalStress` and `EnvironmentalCorrection`, and reframe `EnvironmentalImpact`.**

This is a **contract amendment** (`environment-v1.1`), not a rewrite of Phase 1.5. Observations, records, contexts, merge, and applicability remain frozen.

**Decision 4 approved.** Implemented as `environment-v1.1` — see [`ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md`](./ENVIRONMENTAL_CONTEXT_ENGINE_V1_1_CONTRACT_FREEZE.md).

**Phase 2 may begin.** Public API is frozen.

### 1.1 Frozen pipeline (correct — keep)

```
Provider → Adapter → EnvironmentalObservationRecord (immutable)
                          ↓
              ActivityEnvironment | TodayEnvironment | ForecastEnvironment
                          ↓
              EnvironmentalImpact   ← PROBLEM: overloaded type
                          ↓
              [Phase 2: Twin → Recovery / Fatigue / Adaptation / Reasoning]
```

Everything above `EnvironmentalImpact` is sound and should not change.

### 1.2 What `EnvironmentalImpact` actually contains today

Inspecting `src/core/environment/impact.ts` and `types.ts`:

| Field                     | Semantic role today          | Correct layer                          |
| ------------------------- | ---------------------------- | -------------------------------------- |
| `thermalStress`           | Environmental thermal band   | **Stress**                             |
| `thermalLoad`             | Normalized thermal load 0–1  | **Stress**                             |
| `windExposure`            | Normalized wind exposure 0–1 | **Stress**                             |
| `hydrationStress`         | Hydration demand proxy 0–1   | **Stress**                             |
| `altitudeStress`          | Stub                         | **Stress**                             |
| `airQualityStress`        | Stub                         | **Stress**                             |
| `environmentalDifficulty` | Composite stress mean        | **Stress**                             |
| `applicability`           | Whether environment applies  | **Context** (already on context types) |
| `suppressionReason`       | Why stress was withheld      | **Context**                            |

**No field currently represents impact on physiological models** (recovery demand increase, fatigue accumulation modifier, performance expectation shift, training tolerance reduction).

### 1.3 Identified problem

If Phase 2 wires Recovery/Fatigue to the current `EnvironmentalImpact`:

1. Models receive **stress metrics** under a name implying **interpretation modifiers**.
2. Each model will independently re-derive "what heat means for recovery" — duplicated logic, inconsistent Coach explanations.
3. Activity performance explanation (pace correction) will either leak into physiological models or be absent.

This violates SHARPIT's doctrine: **Signals carry domain meaning; Models consume Signals; Decisions modify interpretation.**

Environmental stress is an **environment-domain Signal**. Environmental impact is a **cross-model modifier**. They must not share one type.

---

## 2. Environmental Stress — review

### 2.1 Proposed definition

**Environmental Stress** = the physiological load imposed by environmental conditions on the athlete, independent of how Recovery/Fatigue/Adaptation choose to respond.

```
Environmental Observations
        ↓
Environmental Context (Activity | Today | Forecast)
        ↓
Environmental Stress
```

### 2.2 Proposed type

```typescript
type EnvironmentalStress = {
  readonly applicability: EnvironmentalApplicability;
  readonly thermal: MetricValue<ThermalStressBand>;
  readonly thermalLoad: MetricValue<number>; // 0–1
  readonly humidityStress: MetricValue<number>; // 0–1 (NEW — split from hydration proxy)
  readonly windExposure: MetricValue<number>; // 0–1
  readonly altitudeStress: MetricValue<number>; // 0–1
  readonly airQualityStress: MetricValue<number>; // 0–1
  readonly hydrationDemand: MetricValue<number>; // 0–1 (rename from hydrationStress)
  readonly compositeStress: MetricValue<number>; // rename from environmentalDifficulty
  readonly suppressionReason: string | null;
};
```

### 2.3 Rationale

| Criterion                     | Assessment                                                           |
| ----------------------------- | -------------------------------------------------------------------- |
| Epistemic clarity             | Stress is environmental fact-with-confidence, not a coaching verdict |
| Model independence            | Recovery can consume `thermalLoad` without importing weather fields  |
| Physical Health parity        | Mirrors `PhysicalHealthSignals` pattern                              |
| Frozen observations untouched | Stress is derived, never mutates records                             |
| Phase 2 readiness             | Twin column `environmentalStressState` is semantically honest        |

### 2.4 Migration from environment-v1

| environment-v1                                | environment-v1.1                      |
| --------------------------------------------- | ------------------------------------- |
| `EnvironmentalImpact.thermalStress`           | `EnvironmentalStress.thermal`         |
| `EnvironmentalImpact.thermalLoad`             | `EnvironmentalStress.thermalLoad`     |
| `EnvironmentalImpact.windExposure`            | `EnvironmentalStress.windExposure`    |
| `EnvironmentalImpact.hydrationStress`         | `EnvironmentalStress.hydrationDemand` |
| `EnvironmentalImpact.environmentalDifficulty` | `EnvironmentalStress.compositeStress` |

`buildEnvironmentalStress()` replaces the stress portion of `buildEnvironmentalImpact()`.

### 2.5 Timing

**Before Phase 2** — required. Twin must persist stress, not a conflated impact bag.

---

## 3. Environmental Impact — reframed

### 3.1 Proposed definition (reframed)

**Environmental Impact** = how environmental stress should modify the _interpretation_ of physiological model outputs — not the raw metrics themselves.

```
Environmental Stress
        ↓
Environmental Impact
        ↓
Recovery / Fatigue / Adaptation / Reasoning (as modifiers, not re-derivations)
```

### 3.2 Proposed type

```typescript
type EnvironmentalImpact = {
  readonly stressReference: {
    readonly compositeStress: number | null;
    readonly dominantStressor:
      'THERMAL' | 'WIND' | 'ALTITUDE' | 'AIR_QUALITY' | 'HYDRATION' | 'NONE';
    readonly confidence: number;
  };
  readonly recoveryDemand: MetricValue<number>; // 0–1 multiplier on recovery need
  readonly fatigueAccumulation: MetricValue<number>; // 0–1 modifier on fatigue interpretation
  readonly performanceExpectation: MetricValue<number>; // 0–1 expected output vs baseline
  readonly trainingTolerance: MetricValue<number>; // 0–1 acceptable load ceiling adjustment
  readonly cardiovascularLoad: MetricValue<number>; // 0–1 expected HR/power drift
  readonly interpretationNotes: readonly I18nItem[]; // deterministic rationale codes
};
```

### 3.3 Examples

| Stress condition          | Impact output                                                                     |
| ------------------------- | --------------------------------------------------------------------------------- |
| High thermal, outdoor run | `recoveryDemand: 0.75`, `cardiovascularLoad: 0.8`, `performanceExpectation: 0.85` |
| Indoor trainer            | All impact fields `NOT_APPLICABLE`, stress suppressed                             |
| Moderate wind, cycling    | `performanceExpectation: 0.92`, `cardiovascularLoad: 0.6`                         |

### 3.4 How physiological models consume Impact

**Pattern (mandatory for Phase 2):**

```typescript
// Recovery model does NOT read weather.
// It receives optional EnvironmentalImpact as a modifier:

adjustedRecoveryDemand = baseRecoveryDemand * (1 + impact.recoveryDemand.value * weight);
```

Models keep their existing inference. Impact is an **optional overlay** with explicit weight and confidence gating — same pattern as Physical Health capacity overriding training advice.

### 3.5 Rationale for reframing (not just renaming)

Without reframed Impact, Phase 2 engineers will embed stress-to-recovery heuristics inside Recovery/Fatigue — untestable duplication. A dedicated Impact builder centralizes "what heat means for interpretation" in one deterministic, explainable module.

### 3.6 Timing

**Before Phase 2** — Impact type must be frozen even if initial builder returns conservative `MISSING` modifiers until calibration.

---

## 4. Environmental Correction — review

### 4.1 Proposed definition

**Environmental Correction** = an explainability layer for **activity performance**, not a physiological state modifier.

```
Raw Performance (pace, power, HR drift — unchanged)
        ↓
Environmental Corrections (heat, wind, altitude — attribution only)
        ↓
Interpreted Performance (narrative + optional adjusted view for Coach/UI)
```

### 4.2 Proposed type

```typescript
type EnvironmentalCorrectionFactor = {
  readonly dimension: 'THERMAL' | 'WIND' | 'ALTITUDE' | 'AIR_QUALITY' | 'HYDRATION';
  readonly attributedEffect: MetricValue<number>; // e.g. +8s/km equivalent
  readonly explanation: string;
  readonly confidence: number;
  readonly quality: EnvironmentalEvidenceQuality;
};

type ActivityEnvironmentalCorrection = {
  readonly activityId: string;
  readonly rawMetricsPreserved: true; // invariant — never false
  readonly factors: readonly EnvironmentalCorrectionFactor[];
  readonly totalAttributedEffect: MetricValue<number>;
  readonly narrative: readonly I18nItem[]; // "Allure ralentie largement expliquée par la chaleur."
};
```

### 4.3 Invariants

| Rule                                         | Enforcement                             |
| -------------------------------------------- | --------------------------------------- |
| Never mutate observations                    | Corrections are derived views only      |
| Never replace raw metrics in DB              | Activity records keep actual pace/power |
| Never feed Correction into Recovery/Fatigue  | Correction is post-hoc explainability   |
| Coach and Activity Detail consume Correction | Phase 3 primary surface                 |
| Optional Reasoning input                     | Reasoning may cite correction narrative |

### 4.4 Relationship to Stress and Impact

```
Stress  → what the environment was (Twin-persisted)
Impact  → how models should adjust (Twin-persisted, consumed by inference)
Correction → how to explain this activity's numbers (Activity-bound, Coach/Detail)
```

Correction **requires** activity metrics + stress. It is computed at activity analysis time, not at daily snapshot time.

### 4.5 Timing

| Deliverable                                   | When                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Type definition + invariants documented       | **Before Phase 2** (freeze boundary)                                           |
| `buildActivityEnvironmentalCorrection()` stub | **Before Phase 2** (returns empty factors)                                     |
| Full attribution algorithm                    | **Phase 3** (Activity Detail) or late Phase 2 if activity analysis hooks exist |

Correction types should be frozen now so Activity Detail does not invent a parallel explanation system.

---

## 5. Generic Context Engine — review

### 5.1 Future engines

| Engine                    | Stress analog            | Impact analog                       | Correction analog                 |
| ------------------------- | ------------------------ | ----------------------------------- | --------------------------------- |
| Environmental             | `EnvironmentalStress`    | `EnvironmentalImpact`               | `ActivityEnvironmentalCorrection` |
| Physical Health           | `PhysicalHealthSignals`  | `PhysicalHealthDecision` + capacity | Session reassessment narrative    |
| Nutrition (future)        | `NutritionStress`?       | `NutritionImpact`?                  | Meal timing explanation           |
| Travel / Jet Lag (future) | `CircadianStress`?       | `CircadianImpact`?                  | —                                 |
| Illness (future)          | Overlaps Physical Health | —                                   | —                                 |

### 5.2 Should SHARPIT introduce `ContextEngine<T>` now?

**No.**

| Argument for generalization           | Counter                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| Consistent pattern across engines     | Only 2 engines exist; abstraction is speculative              |
| Shared `MetricValue<T>` already works | Already shared — sufficient                                   |
| Shared applicability pattern          | Each domain has different applicability rules                 |
| Reduces duplication                   | Risk of lowest-common-denominator types that fit nothing well |

### 5.3 Recommended approach

Document a **convergent pattern** in `docs/domain/DOMAIN.md` (or a short ADR) without shared code:

```
Observations → Context → Stress (domain signals) → Impact (model modifiers) → [Correction (explainability, optional)]
```

Each engine owns its types. Extract shared utilities (`MetricValue`, quality enums, confidence) — already done.

**Revisit generic abstraction when a third context engine (Nutrition or Travel) is approved** — rule of three.

---

## 6. Proposed final pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENTAL CONTEXT ENGINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│  EnvironmentalObservationRecord  →  immutable evidence                   │
│  ActivityEnvironment | TodayEnvironment | ForecastEnvironment            │
│  EnvironmentalStress             →  domain signals (Twin-persisted)        │
│  EnvironmentalImpact             →  model modifiers (Twin-persisted)     │
│  ActivityEnvironmentalCorrection →  explainability (Activity-bound)      │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │                    │
         ▼                              ▼                    ▼
   Digital Twin                  Recovery / Fatigue /     Activity Detail /
   environmentalState            Adaptation / Reasoning    Coach (Phase 3)
```

### Twin columns (Phase 2 preview)

| Column                     | Type                         | Refresh policy                       |
| -------------------------- | ---------------------------- | ------------------------------------ |
| `environmentalStressState` | `EnvironmentalStress`        | Activity: frozen; Today: refreshable |
| `environmentalImpactState` | `EnvironmentalImpact`        | Derived from stress + applicability  |
| Activity binding           | `ActivityEnvironmentBinding` | Immutable record ids                 |

`ActivityEnvironmentalCorrection` is **not** a Twin column — it lives on activity analysis artifact or presentation VM.

---

## 7. Option evaluation

### Option 1 — Keep unchanged

| Pros                          | Cons                                              |
| ----------------------------- | ------------------------------------------------- |
| No contract churn             | `EnvironmentalImpact` name lies about contents    |
| Phase 2 can start immediately | Models will duplicate stress→interpretation logic |
|                               | Activity explanation has no home                  |
|                               | Permanent technical debt frozen into Twin         |

**Verdict: Reject.** The naming and layering error is structural, not cosmetic.

---

### Option 2 — Introduce EnvironmentalStress only

| Pros                           | Cons                                                   |
| ------------------------------ | ------------------------------------------------------ |
| Fixes naming conflation        | Models still derive interpretation independently       |
| Smaller change than full split | No explainability layer for activities                 |
| Clear Twin stress column       | Coach still says "you were slower" without attribution |

**Verdict: Insufficient.** Stress separation is necessary but not sufficient.

---

### Option 3 — Introduce EnvironmentalCorrection only

| Pros                    | Cons                                                           |
| ----------------------- | -------------------------------------------------------------- |
| Great Coach/Activity UX | Physiological models still coupled to stress-under-impact name |
|                         | Correction without stress type duplicates metrics              |
|                         | Twin boundary remains ambiguous                                |

**Verdict: Insufficient.** Correction is additive, not a substitute for stress/impact split.

---

### Option 4 — Introduce both EnvironmentalStress and EnvironmentalCorrection; reframe EnvironmentalImpact

| Pros                                  | Cons                                         |
| ------------------------------------- | -------------------------------------------- |
| Clean epistemic boundaries            | Requires environment-v1.1 contract amendment |
| Matches Physical Health pattern       | ~2–3 days implementation before Phase 2      |
| Twin integration is honest            | Three public types instead of one            |
| Correction frozen for Activity Detail |                                              |
| Impact centralizes model modifiers    |                                              |

**Verdict: Accept — recommended.**

---

### Option 5 — Reject both with justification

Would only be valid if:

- Current `EnvironmentalImpact` were already split semantically (it is not), or
- SHARPIT decided environment never influences physiological models (product decision — not the case).

**Verdict: Reject.** Technical justification for rejection does not hold.

---

## 8. Decision

### **Decision 4 — Introduce both `EnvironmentalStress` and `EnvironmentalCorrection`; reframe `EnvironmentalImpact`.**

This becomes the permanent public boundary consumed by the Digital Twin and downstream systems.

### Contract versioning

| Version            | Status after this decision                                              |
| ------------------ | ----------------------------------------------------------------------- |
| `environment-v1`   | Superseded for Impact public shape; records/contexts/merge remain valid |
| `environment-v1.1` | New freeze target before Phase 2                                        |

### Implementation scope (pre-Phase 2 amendment)

| Item                                              | Required before Phase 2 | Notes                               |
| ------------------------------------------------- | ----------------------- | ----------------------------------- |
| `EnvironmentalStress` type + builder              | ✅                      | Migrate fields from current Impact  |
| `EnvironmentalImpact` reframed type + builder     | ✅                      | Initial conservative modifiers      |
| `ActivityEnvironmentalCorrection` type            | ✅                      | Builder stub acceptable             |
| `buildActivityEnvironmentalCorrection()`          | ✅                      | Returns empty factors until Phase 3 |
| Update context types to carry `stress` + `impact` | ✅                      | Replace single `impact` field       |
| Update tests + migration doc + freeze report      | ✅                      |                                     |
| Full correction attribution algorithm             | ❌ Phase 3              |                                     |
| Generic Context Engine abstraction                | ❌ Rejected             | Document pattern only               |
| Twin / Snapshot / Recovery wiring                 | ❌ Phase 2              | Blocked until v1.1 approved         |

### What remains frozen from environment-v1

- `EnvironmentalObservationRecord` immutability semantics
- Context family (`ActivityEnvironment`, `TodayEnvironment`, `ForecastEnvironment`)
- `EnvironmentalEvidenceQuality` / quality-confidence separation
- Provider collect + merge architecture
- `EnvironmentalApplicability`
- Dimension decomposition

---

## 9. Phase 2 entry criteria (updated)

Phase 2 may begin when:

1. ✅ This boundary review is approved
2. ⬜ `environment-v1.1` implemented and frozen
3. ⬜ Twin schema uses `environmentalStressState` + `environmentalImpactState` (not conflated type)
4. ⬜ Recovery/Fatigue/Adaptation integration spec confirms: models consume **Impact**, never weather or Correction

**Phase 2 remains blocked.**

---

## 10. Approval

| Role                   | Decision                                   | Date       |
| ---------------------- | ------------------------------------------ | ---------- |
| Product / Architecture | _Pending_                                  |            |
| Implementation         | Ready for `environment-v1.1` upon approval | 2026-07-10 |
