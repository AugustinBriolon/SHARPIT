# DATA EXPOSURE AUDIT

**Date:** 2026-07-03  
**Scope:** Every physiological metric computed by the SHARPIT inference pipeline, mapped to its current UI exposure and recommended placement.

---

## Methodology

Four visibility tiers:

| Tier           | Meaning                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| **Primary**    | Shown immediately, large, above the fold. The athlete sees it without scrolling or tapping.                   |
| **Supporting** | Clearly visible in the detail view, medium weight. Adds context to primary data.                              |
| **Advanced**   | Available in the detail view but de-emphasised. For the curious athlete.                                      |
| **Hidden**     | Internal routing value, confidence score used by other models, or debug metadata. Never shown to the athlete. |

An `✓` means the field is currently rendered. An `—` means it is computed and returned by the API but not rendered anywhere in the UI.

---

## 1. Recovery Engine (`recovery-synthesis-v1`)

**Producing file:** `src/core/inference/recovery/model.ts`  
**API route:** `src/app/api/recovery/route.ts`  
**Type interface:** `RecoveryData` in `src/hooks/use-today.ts`

### 1.1 State fields

| Field                             | Type                                                              | API? | Typed? | Rendered?         | Recommended Tier | Where to surface                                     |
| --------------------------------- | ----------------------------------------------------------------- | ---- | ------ | ----------------- | ---------------- | ---------------------------------------------------- |
| `readinessScore`                  | `number \| null`                                                  | ✓    | ✓      | ✓                 | **Primary**      | Score card, Recovery detail header                   |
| `readinessCategory`               | `ReadinessCategory`                                               | ✓    | ✓      | ✓                 | **Primary**      | Score card trend, Recovery detail signal             |
| `dimensions.autonomic.score`      | `number \| null`                                                  | ✓    | ✓      | ✓                 | **Supporting**   | Recovery detail: dimension bar                       |
| `dimensions.autonomic.status`     | `string`                                                          | ✓    | ✓      | —                 | **Supporting**   | Recovery detail: below dimension bar                 |
| `dimensions.autonomic.available`  | `boolean`                                                         | ✓    | ✓      | ✓ (as guard)      | **Hidden**       | Gate only                                            |
| `dimensions.sleep.score`          | `number \| null`                                                  | ✓    | ✓      | ✓                 | **Supporting**   | Sleep detail: dimension bar                          |
| `dimensions.sleep.status`         | `string`                                                          | ✓    | ✓      | ✓                 | **Supporting**   | Sleep detail: status label                           |
| `dimensions.sleep.available`      | `boolean`                                                         | ✓    | ✓      | ✓ (as guard)      | **Hidden**       | Gate only                                            |
| `dimensions.subjective.score`     | `number \| null`                                                  | ✓    | ✓      | ✓                 | **Supporting**   | Recovery detail: dimension bar                       |
| `dimensions.subjective.status`    | `string`                                                          | ✓    | ✓      | —                 | **Supporting**   | Recovery detail: below dimension bar                 |
| `dimensions.loadContext.score`    | `number \| null`                                                  | ✓    | ✓      | ✓                 | **Supporting**   | Recovery detail: dimension bar                       |
| `dimensions.loadContext.status`   | `string`                                                          | ✓    | ✓      | —                 | **Supporting**   | Recovery detail: below dimension bar                 |
| **`primaryLimitingFactor`**       | `'autonomic' \| 'sleep' \| 'subjective' \| 'loadContext' \| null` | ✓    | **—**  | **—**             | **Supporting**   | Recovery detail: "Facteur limitant" badge            |
| **`estimatedTimeToFullRecovery`** | `number \| null`                                                  | ✓    | **—**  | **—**             | **Supporting**   | Recovery detail: "Récupération estimée dans X jours" |
| `confidence`                      | `number`                                                          | ✓    | ✓      | ✓                 | **Hidden**       | Confidence block only                                |
| `dataCompleteness`                | `string`                                                          | ✓    | —      | ✓ (via reasoning) | **Hidden**       | Confidence block only                                |

### 1.2 Signal fields

| Field                            | Type               | Values                                                                       | API? | Typed?  | Rendered?              | Recommended Tier | Where to surface                                          |
| -------------------------------- | ------------------ | ---------------------------------------------------------------------------- | ---- | ------- | ---------------------- | ---------------- | --------------------------------------------------------- |
| **`signals.autonomicBalance`**   | string             | `ENHANCED / NORMAL / MILDLY_SUPPRESSED / SUPPRESSED / CRITICALLY_SUPPRESSED` | ✓    | **—**   | **—**                  | **Supporting**   | Recovery detail: autonomic system status chip             |
| **`signals.sleepAdequacy`**      | string             | `EXCELLENT / ADEQUATE / INSUFFICIENT / SEVERELY_INSUFFICIENT`                | ✓    | partial | ✓ (partial)            | **Supporting**   | Sleep detail: quality label                               |
| **`signals.subjectiveWellness`** | string             | `HIGH / NORMAL / LOW / VERY_LOW`                                             | ✓    | **—**   | **—**                  | **Supporting**   | Recovery detail: subjective wellness chip                 |
| **`signals.loadStressContext`**  | string             | `UNDERTRAINED / OPTIMAL / ELEVATED / HIGH / CRITICAL`                        | ✓    | **—**   | **—**                  | **Supporting**   | Recovery detail: load context chip                        |
| `signals.overreachingRisk`       | `OverreachingRisk` | `LOW / MODERATE / HIGH / CRITICAL`                                           | ✓    | ✓       | ✓ (HIGH/CRITICAL only) | **Advanced**     | Recovery detail: risk flag (show MODERATE+ not just HIGH) |
| `signals.illnessRisk`            | `IllnessRisk`      | `LOW / ELEVATED / HIGH`                                                      | ✓    | ✓       | ✓ (HIGH only)          | **Advanced**     | Recovery detail: risk flag (show ELEVATED+ not just HIGH) |
| **`signals.dissonanceDetected`** | `boolean`          | —                                                                            | ✓    | **—**   | **—**                  | **Advanced**     | Recovery detail: "⚡ Signaux contradictoires détectés"    |

### 1.3 Decision fields

| Field                           | Type                      | API? | Typed? | Rendered?                 | Recommended Tier | Where to surface                                     |
| ------------------------------- | ------------------------- | ---- | ------ | ------------------------- | ---------------- | ---------------------------------------------------- |
| `decision.verdict`              | `RecoveryDecisionVerdict` | ✓    | ✓      | — (routes reasoning only) | **Hidden**       | Internal routing                                     |
| `decision.recommendedIntensity` | `RecommendedIntensity`    | ✓    | ✓      | ✓                         | **Primary**      | Recovery detail: intensity card                      |
| **`decision.rationale`**        | `I18nItem[]`              | ✓    | **—**  | **—**                     | **Supporting**   | Recovery detail: "Pourquoi cette intensité?" bullets |
| `recommendation.keyEvidence`    | `I18nItem[]`              | ✓    | ✓      | ✓                         | **Supporting**   | Recovery detail: key signals list                    |

---

## 2. Fatigue Engine (`fatigue-v1`)

**Producing file:** `src/core/inference/fatigue/model.ts`  
**API route:** `src/app/api/fatigue/route.ts`  
**Type interface:** `FatigueData` in `src/hooks/use-today.ts`

### 2.1 State fields

| Field                               | Type                | API?                                                                                                                                    | Typed? | Rendered? | Recommended Tier | Where to surface                                    |
| ----------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | ---------------- | --------------------------------------------------- |
| `fatigueIndex`                      | `number \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Primary**      | Effort score card, Effort detail header             |
| `fatigueLevel`                      | `FatigueLevel`      | ✓                                                                                                                                       | ✓      | ✓         | **Primary**      | Effort score card trend                             |
| **`fatigueType`**                   | string              | `LOAD_DOMINANT / NEUROMUSCULAR_DOMINANT / METABOLIC_DOMINANT / PSYCHOLOGICAL_DOMINANT / CUMULATIVE_MULTI_SYSTEM / MIXED / UNDETERMINED` | ✓      | **—**     | **—**            | **Supporting**                                      | Effort detail: "Type de fatigue: Neuromusculaire" |
| `trajectory`                        | `FatigueTrajectory` | ✓                                                                                                                                       | ✓      | ✓         | **Primary**      | Effort score card arrow                             |
| `dimensions.load.score`             | `number \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Supporting**   | Effort detail: dimension bar                        |
| `dimensions.load.status`            | `string`            | ✓                                                                                                                                       | ✓      | —         | **Supporting**   | Effort detail: dimension status                     |
| `dimensions.neuromuscular.score`    | `number \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Supporting**   | Effort detail: dimension bar                        |
| `dimensions.neuromuscular.status`   | `string`            | ✓                                                                                                                                       | ✓      | —         | **Supporting**   | Effort detail: dimension status                     |
| `dimensions.metabolic.score`        | `number \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Supporting**   | Effort detail: dimension bar                        |
| `dimensions.metabolic.status`       | `string`            | ✓                                                                                                                                       | ✓      | —         | **Supporting**   | Effort detail: dimension status                     |
| `dimensions.cumulative.score`       | `number \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Supporting**   | Effort detail: dimension bar                        |
| `dimensions.cumulative.status`      | `string`            | ✓                                                                                                                                       | ✓      | —         | **Supporting**   | Effort detail: dimension status                     |
| `dimensions.psychological.score`    | `number \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Supporting**   | Effort detail: dimension bar                        |
| `dimensions.psychological.status`   | `string`            | ✓                                                                                                                                       | ✓      | —         | **Supporting**   | Effort detail: dimension status                     |
| `dominantDimension`                 | `string \| null`    | ✓                                                                                                                                       | ✓      | ✓         | **Supporting**   | Effort detail: dominant dimension callout           |
| **`primaryLimitingFactor`**         | `string \| null`    | ✓                                                                                                                                       | **—**  | **—**     | **Supporting**   | Effort detail: description of dominant mechanism    |
| `trainingCapacity`                  | `TrainingCapacity`  | ✓                                                                                                                                       | ✓      | ✓         | **Primary**      | Effort detail: capacity card                        |
| **`consecutiveAccumulationDays`**   | `number`            | ✓                                                                                                                                       | **—**  | **—**     | **Supporting**   | Effort detail: "X jours d'accumulation consécutifs" |
| **`estimatedTimeToFresh`**          | `number \| null`    | ✓                                                                                                                                       | **—**  | **—**     | **Supporting**   | Effort detail: "Récupération estimée dans X jours"  |
| **`performanceImpairmentEstimate`** | `number`            | ✓                                                                                                                                       | **—**  | **—**     | **Advanced**     | Effort detail: "Capacité actuelle ~X% de votre max" |
| `confidence`                        | `number`            | ✓                                                                                                                                       | ✓      | ✓         | **Hidden**       | Confidence block only                               |

### 2.2 Signal fields

| Field                                | Type               | API? | Typed? | Rendered? | Recommended Tier | Where to surface                          |
| ------------------------------------ | ------------------ | ---- | ------ | --------- | ---------------- | ----------------------------------------- |
| `signals.functionalOverreachingRisk` | `OverreachingRisk` | ✓    | ✓      | —         | **Advanced**     | Effort detail: risk flag (show MODERATE+) |
| `signals.isAccumulating`             | `boolean`          | ✓    | **—**  | **—**     | **Hidden**       | Implicit in trajectory display            |

### 2.3 Decision fields

| Field                        | Type                     | API? | Typed? | Rendered?                | Recommended Tier | Where to surface                                  |
| ---------------------------- | ------------------------ | ---- | ------ | ------------------------ | ---------------- | ------------------------------------------------- |
| `decision.verdict`           | `FatigueDecisionVerdict` | ✓    | ✓      | — (routes session block) | **Hidden**       | Internal routing                                  |
| `decision.trainingCapacity`  | `TrainingCapacity`       | ✓    | ✓      | ✓                        | **Primary**      | Session block                                     |
| **`decision.rationale`**     | `I18nItem[]`             | ✓    | **—**  | **—**                    | **Supporting**   | Effort detail: "Pourquoi cette capacité?" bullets |
| `recommendation.keyEvidence` | `I18nItem[]`             | ✓    | ✓      | ✓                        | **Supporting**   | Effort detail: key signals list                   |

---

## 3. Adaptation Engine (`adaptation-v1`)

**Producing file:** `src/core/inference/adaptation/model.ts`  
**API route:** `src/app/api/adaptation/route.ts`  
**Type interface:** `AdaptationData` in `src/hooks/use-today.ts`

> **Note:** `AdaptationData` is the most under-typed interface. Almost all fields are computed and returned by the API but missing from the hook type.

### 3.1 State fields

| Field                                       | Type               | API? | Typed? | Rendered? | Recommended Tier | Where to surface                                          |
| ------------------------------------------- | ------------------ | ---- | ------ | --------- | ---------------- | --------------------------------------------------------- |
| **`adaptationIndex`**                       | `number \| null`   | ✓    | **—**  | **—**     | **Primary**      | Health monitor block score, future Adaptation detail page |
| `adaptationStatus`                          | `AdaptationStatus` | ✓    | ✓      | ✓         | **Supporting**   | Health monitor: signal row                                |
| `adaptationTrend`                           | `AdaptationTrend`  | ✓    | ✓      | ✓         | **Supporting**   | Health monitor: trend arrow                               |
| **`dimensions.loadProgression`**            | `DimensionResult`  | ✓    | **—**  | **—**     | **Advanced**     | Future Adaptation detail page                             |
| **`dimensions.neuromuscularEfficiency`**    | `DimensionResult`  | ✓    | **—**  | **—**     | **Advanced**     | Future Adaptation detail page                             |
| **`dimensions.autonomicAdaptation`**        | `DimensionResult`  | ✓    | **—**  | **—**     | **Advanced**     | Future Adaptation detail page                             |
| **`dimensions.recoveryQuality`**            | `DimensionResult`  | ✓    | **—**  | **—**     | **Advanced**     | Future Adaptation detail page                             |
| **`limitingFactor`**                        | `string \| null`   | ✓    | **—**  | **—**     | **Supporting**   | Health monitor: limits adaptation chip                    |
| **`estimatedAdaptationPeak`**               | `number \| null`   | ✓    | **—**  | **—**     | **Advanced**     | Future Adaptation detail page                             |
| **`plateauRisk`**                           | `boolean`          | ✓    | **—**  | **—**     | **Supporting**   | Health monitor: "⚠ Risque de plateau" flag                |
| **`overreachingWithoutAdaptationDetected`** | `boolean`          | ✓    | **—**  | **—**     | **Advanced**     | Future Adaptation detail page                             |
| `confidence`                                | `number`           | ✓    | ✓      | ✓         | **Hidden**       | Confidence block                                          |

### 3.2 Signal fields

| Field                                               | Type             | API? | Typed? | Rendered? | Recommended Tier | Where to surface         |
| --------------------------------------------------- | ---------------- | ---- | ------ | --------- | ---------------- | ------------------------ |
| `signals.adaptationStatus`                          | string           | ✓    | **—**  | **—**     | **Hidden**       | Duplicate of state field |
| `signals.adaptationTrend`                           | string           | ✓    | **—**  | **—**     | **Hidden**       | Duplicate of state field |
| `signals.adaptationIndex`                           | `number \| null` | ✓    | **—**  | **—**     | **Hidden**       | Duplicate of state field |
| **`signals.plateauRisk`**                           | `boolean`        | ✓    | **—**  | **—**     | **Supporting**   | Via state.plateauRisk    |
| **`signals.overreachingWithoutAdaptationDetected`** | `boolean`        | ✓    | **—**  | **—**     | **Advanced**     | Via state field          |
| `signals.availableDimensionCount`                   | `number`         | ✓    | **—**  | **—**     | **Hidden**       | Confidence block         |
| `signals.historyLength`                             | `number`         | ✓    | **—**  | **—**     | **Hidden**       | Confidence block         |

### 3.3 Decision fields

| Field                        | Type                        | API? | Typed? | Rendered? | Recommended Tier | Where to surface                  |
| ---------------------------- | --------------------------- | ---- | ------ | --------- | ---------------- | --------------------------------- |
| `decision.verdict`           | `AdaptationDecisionVerdict` | ✓    | ✓      | ✓         | **Supporting**   | Session block: adaptation verdict |
| `decision.loadMultiplier`    | `number`                    | ✓    | ✓      | —         | **Advanced**     | Future Adaptation detail page     |
| **`decision.rationale`**     | `I18nItem[]`                | ✓    | **—**  | **—**     | **Supporting**   | Future Adaptation detail page     |
| `recommendation.keyEvidence` | `I18nItem[]`                | ✓    | ✓      | —         | **Supporting**   | Future Adaptation detail page     |

---

## 4. Reasoning Engine (`reasoning-v1`)

**Producing file:** `src/core/inference/reasoning/model.ts`  
**API route:** `src/app/api/reasoning/route.ts`  
**Type interface:** `ReasoningData` in `src/hooks/use-today.ts`

### 4.1 State fields

| Field                      | Type                                                                    | API? | Typed? | Rendered?        | Recommended Tier | Where to surface                                     |
| -------------------------- | ----------------------------------------------------------------------- | ---- | ------ | ---------------- | ---------------- | ---------------------------------------------------- |
| `overallVerdict`           | `OverallVerdict`                                                        | ✓    | ✓      | ✓                | **Primary**      | NarrativeHeader                                      |
| `topAction`                | `TopAction`                                                             | ✓    | ✓      | ✓                | **Primary**      | NarrativeHeader                                      |
| `keyFindings`              | `KeyFinding[]`                                                          | ✓    | ✓      | ✓                | **Supporting**   | ReasoningBlock                                       |
| `limitingFactor`           | `LimitingFactor`                                                        | ✓    | ✓      | ✓                | **Supporting**   | HealthMonitorBlock                                   |
| `opportunities`            | `Opportunity[]`                                                         | ✓    | ✓      | **—**            | **Supporting**   | Today: below HealthMonitor ("Opportunités")          |
| `conflicts`                | `Conflict[]`                                                            | ✓    | ✓      | **—**            | **Advanced**     | Today: collapsible "Conflits détectés"               |
| `physiologicalConsistency` | `PhysiologicalConsistency`                                              | ✓    | ✓      | ✓                | **Supporting**   | ConfidenceBlock                                      |
| `consistencyScore`         | `number`                                                                | ✓    | ✓      | ✓                | **Supporting**   | ConfidenceBlock                                      |
| `confidence`               | `number`                                                                | ✓    | ✓      | ✓                | **Hidden**       | ConfidenceBlock                                      |
| **`evidenceGraph`**        | `{ recoveryContribution, fatigueContribution, adaptationContribution }` | ✓    | **—**  | **—**            | **Advanced**     | ConfidenceBlock: "Systèmes actifs" contribution bars |
| `systemAttentionPriority`  | `SystemAttentionPriority`                                               | ✓    | ✓      | — (routing only) | **Hidden**       | Internal routing                                     |

### 4.2 Signal fields

| Field                         | Type      | API? | Typed? | Rendered? | Recommended Tier | Where to surface                   |
| ----------------------------- | --------- | ---- | ------ | --------- | ---------------- | ---------------------------------- |
| `signals.availableModelCount` | `number`  | ✓    | ✓      | ✓         | **Hidden**       | ConfidenceBlock                    |
| `signals.modelDirections`     | object    | ✓    | **—**  | **—**     | **Hidden**       | Debug only                         |
| `signals.conflictCount`       | `number`  | ✓    | **—**  | **—**     | **Hidden**       | Inferred from conflicts.length     |
| `signals.opportunityCount`    | `number`  | ✓    | **—**  | **—**     | **Hidden**       | Inferred from opportunities.length |
| `signals.keyFindingCount`     | `number`  | ✓    | **—**  | **—**     | **Hidden**       | Inferred from keyFindings.length   |
| `signals.hasRecoveryState`    | `boolean` | ✓    | ✓      | —         | **Hidden**       | Internal data completeness check   |
| `signals.hasFatigueState`     | `boolean` | ✓    | ✓      | —         | **Hidden**       | Internal data completeness check   |
| `signals.hasAdaptationState`  | `boolean` | ✓    | ✓      | —         | **Hidden**       | Internal data completeness check   |

---

## 5. Summary: fields not yet rendered

The following fields are computed, persisted in the Digital Twin, returned by the API, but **never shown to the athlete**. All are scientifically meaningful and directly actionable.

### Immediate value — add to existing detail pages

| Field                                   | Domain    | Tier       | Page              |
| --------------------------------------- | --------- | ---------- | ----------------- |
| `recovery.signals.autonomicBalance`     | Recovery  | Supporting | `/today/recovery` |
| `recovery.signals.subjectiveWellness`   | Recovery  | Supporting | `/today/recovery` |
| `recovery.signals.loadStressContext`    | Recovery  | Supporting | `/today/recovery` |
| `recovery.signals.dissonanceDetected`   | Recovery  | Advanced   | `/today/recovery` |
| `recovery.primaryLimitingFactor`        | Recovery  | Supporting | `/today/recovery` |
| `recovery.estimatedTimeToFullRecovery`  | Recovery  | Supporting | `/today/recovery` |
| `recovery.decision.rationale`           | Recovery  | Supporting | `/today/recovery` |
| `recovery.dimensions.*.status`          | Recovery  | Supporting | `/today/recovery` |
| `fatigue.fatigueType`                   | Fatigue   | Supporting | `/today/effort`   |
| `fatigue.consecutiveAccumulationDays`   | Fatigue   | Supporting | `/today/effort`   |
| `fatigue.estimatedTimeToFresh`          | Fatigue   | Supporting | `/today/effort`   |
| `fatigue.performanceImpairmentEstimate` | Fatigue   | Advanced   | `/today/effort`   |
| `fatigue.primaryLimitingFactor`         | Fatigue   | Supporting | `/today/effort`   |
| `fatigue.decision.rationale`            | Fatigue   | Supporting | `/today/effort`   |
| `fatigue.dimensions.*.status`           | Fatigue   | Supporting | `/today/effort`   |
| `reasoning.opportunities`               | Reasoning | Supporting | Today main view   |

### Medium-term — requires dedicated Adaptation page

| Field                                              | Domain     | Tier       | Page                              |
| -------------------------------------------------- | ---------- | ---------- | --------------------------------- |
| `adaptation.adaptationIndex`                       | Adaptation | Primary    | Future `/today/adaptation`        |
| `adaptation.dimensions` (4 fields)                 | Adaptation | Supporting | Future `/today/adaptation`        |
| `adaptation.limitingFactor`                        | Adaptation | Supporting | Future `/today/adaptation`        |
| `adaptation.plateauRisk`                           | Adaptation | Supporting | HealthMonitorBlock or future page |
| `adaptation.overreachingWithoutAdaptationDetected` | Adaptation | Advanced   | Future `/today/adaptation`        |
| `adaptation.decision.rationale`                    | Adaptation | Supporting | Future `/today/adaptation`        |
| `reasoning.evidenceGraph`                          | Reasoning  | Advanced   | ConfidenceBlock                   |
| `reasoning.conflicts`                              | Reasoning  | Advanced   | Today main view                   |

---

## 6. Implementation priorities

### Phase 1 — Zero new engineering, pure exposure (this sprint)

All fields below are already computed, already in the API response. Only type extensions + UI code needed.

1. **`recovery/page.tsx`** — add signals section, estimated recovery time, primary limiting factor, rationale bullets, dimension status labels
2. **`effort/page.tsx`** — add fatigueType chip, consecutive accumulation days, estimated time to fresh, performance impairment estimate, rationale bullets, dimension status labels
3. **`sleep/page.tsx`** — use proper `sleepAdequacy` signal values, add dimension status, add estimated recovery time context

### Phase 2 — Today view enrichment

4. **`HealthMonitorBlock`** — add `adaptation.plateauRisk` flag
5. **Opportunities** — add a new `OpportunitiesBlock` below HealthMonitor for `reasoning.opportunities[]`

### Phase 3 — Adaptation detail page

6. **`/today/adaptation/page.tsx`** — dedicated page for `adaptationIndex` + 4 dimension bars + plateau risk + decision rationale
