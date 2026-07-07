# SHARPIT — Snapshot Quality V1 Audit

> **Status:** Canonical audit — prerequisite for external exposure (notifications, widgets, Watch)  
> **Date:** July 2026  
> **Related:** [`ATHLETE_SNAPSHOT.md`](ATHLETE_SNAPSHOT.md) · [`EVENT_DRIVEN_ARCHITECTURE.md`](EVENT_DRIVEN_ARCHITECTURE.md)

---

## Executive summary

The Athlete Snapshot architecture is **structurally sound** but **not yet externally trustworthy**.

| Layer                          | Verdict                                         |
| ------------------------------ | ----------------------------------------------- |
| Orchestration & persistence    | ✅ Solid foundation                             |
| Inference payloads in snapshot | ⚠️ Mostly ready, some calibration gaps          |
| Derived product fields         | ⚠️ Mixed — some duplicates, some fallbacks      |
| Briefing (recommendations)     | ⚠️ LLM — improving but not deterministic        |
| Today UI                       | ⚠️ Still dual data plane + visible placeholders |
| External readiness             | ❌ Not yet                                      |

**Gate for notifications / widgets / Watch:** all Tier 1 + Tier 2 items below.

---

## 1. Athlete Snapshot — field-by-field audit

Legend:

| Classification            | Meaning                                            |
| ------------------------- | -------------------------------------------------- |
| **READY**                 | Meaningful, stable, athlete-facing wording OK      |
| **Needs refinement**      | Usable in-app; gaps before external exposure       |
| **Should not expose yet** | Missing, stale, ambiguous, or implementation-leaky |

---

### 1.1 Meta & identity

| Field           | Source                              | Models             | Assumptions                            | Missing when | Stale when                               | Confidence                           | Wording        | Class                                                                               |
| --------------- | ----------------------------------- | ------------------ | -------------------------------------- | ------------ | ---------------------------------------- | ------------------------------------ | -------------- | ----------------------------------------------------------------------------------- |
| `snapshotId`    | `computeSnapshotId()` hash          | None (fingerprint) | Same inputs → same id                  | Never        | Never (immutable per generation)         | High (deterministic)                 | N/A (internal) | **READY**                                                                           |
| `athleteId`     | Hardcoded `'default'`               | —                  | Single-user app                        | Never        | Never                                    | N/A                                  | N/A (internal) | **Needs refinement** — multi-athlete not supported                                  |
| `trainingDayId` | Orchestrator / API param            | —                  | Calendar day in athlete TZ ≈ server TZ | Never        | Midnight rollover                        | High                                 | N/A (internal) | **READY**                                                                           |
| `generatedAt`   | `buildAthleteSnapshot()` wall clock | —                  | ISO timestamp at build                 | Never        | Immediately after build if inputs change | Medium — not same as inference times | N/A (internal) | **Needs refinement** — should expose `inferenceGeneratedAt` separately for athletes |

---

### 1.2 `freshness`

| Field                             | Source                           | Models                                                                                        | Assumptions                                                                | Missing when        | Stale when                           | Confidence                                                  | Wording                                                | Class                                                           |
| --------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `freshness` (whole)               | `computeFreshnessSnapshot()`     | Twin `computedAt`, Observation timestamps, provider `lastSyncAt`, `DailyBriefing.generatedAt` | Observations land in Observation table; twin states reflect last inference | DB unreachable      | Any domain evidence newer than model | Medium — heuristic thresholds (6h Garmin, 14h sleep window) | `product-states.ts` messages are good athlete language | **Needs refinement**                                            |
| `freshness.domains[].state`       | Internal diagnostic string       | —                                                                                             | —                                                                          | —                   | —                                    | N/A                                                         | Technical — must never leak to UI                      | **Should not expose yet** (currently not shown — keep internal) |
| `freshness.primaryProductMessage` | First non-null domain message    | —                                                                                             | Priority = array order, not severity                                       | All domains fresh   | Any non-fresh domain                 | Medium                                                      | Understandable                                         | **READY** (in-app only)                                         |
| `freshness.providers[]`           | Integration accounts             | —                                                                                             | Connected = row exists                                                     | Provider not linked | `lastSyncAt` > threshold             | High for connectivity                                       | N/A (internal)                                         | **Needs refinement** — useful for settings, not athlete copy    |
| `freshness.overallFresh`          | All domains fresh or unavailable | —                                                                                             | `unavailable` counts as OK                                                 | —                   | Any stale/syncing/awaiting           | Medium                                                      | N/A                                                    | **READY** (internal gate)                                       |

**Freshness gaps:**

- Sleep staleness uses `recoveryAt` as `lastUpdatedAt` — conflates sleep domain with recovery timestamp.
- `training` domain tracks `fatigueAt`, not `dailyStrain` — effort ring can update without freshness knowing.
- `recommendations` stale on new session but **not** on phase change (morning → afternoon).
- `pickPrimaryProductMessage` returns first stale domain, not the most athlete-relevant one.

---

### 1.3 `recovery`

| Field                        | Source                                           | Models                  | Assumptions                                             | Missing when                            | Stale when                                  | Confidence                               | Wording                                          | Class                                          |
| ---------------------------- | ------------------------------------------------ | ----------------------- | ------------------------------------------------------- | --------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `recovery` (whole)           | Recovery Engine v1 → `DigitalTwin.recoveryState` | `recovery-synthesis-v1` | HRV, sleep, subjective wellness, load context available | Engine error; no observations           | New sleep/subjective obs after `computedAt` | Engine `confidence` + `dataCompleteness` | Drill-down OK; ring label « Récupération » clear | **READY** with data                            |
| `recovery.readinessScore`    | Recovery model output                            | Recovery                | 0–100 scale calibrated per athlete                      | `BASELINE_PENDING`, `INSUFFICIENT_DATA` | Post-sleep sync                             | Model confidence                         | % in ring — clear                                | **READY**                                      |
| `recovery.readinessCategory` | Recovery model                                   | Recovery                | Ordinal categories                                      | Insufficient dimensions                 | Same as above                               | High when not `INSUFFICIENT_DATA`        | Mapped in `today-mapping`                        | **READY**                                      |
| `recovery.dimensions.*`      | Recovery model                                   | Recovery                | 4 dimensions (autonomic, sleep, subjective, load)       | Per-dimension `available: false`        | Evidence newer than inference               | Per-dimension                            | « Signaux actifs 2/4 » is calibration UX — OK    | **Needs refinement** during `BASELINE_PENDING` |
| `recovery.signals.*`         | Recovery feature extraction                      | Features → Recovery     | Garmin HRV labels, sleep adequacy                       | Missing Garmin data                     | Stale observations                          | Medium                                   | « SNV » acronym may confuse some athletes        | **Needs refinement** (wording)                 |
| `recovery.decision`          | Recovery orchestrator                            | Recovery                | Intensity recommendation                                | `INSUFFICIENT_DATA`                     | Stale                                       | Model confidence                         | Internal codes via i18n — OK in drill-down       | **READY**                                      |
| `recovery.recommendation`    | Recovery orchestrator                            | Recovery                | Typed recommendation                                    | Missing                                 | Stale                                       | Model confidence                         | Evidence via `resolve()` — OK                    | **READY**                                      |
| `recovery.computedAt`        | Engine pass timestamp                            | —                       | —                                                       | Never if recovery exists                | —                                           | High                                     | Shown indirectly in narrative freshness          | **READY**                                      |

**Also exposed as top-level `readiness`:** duplicate of `recovery.readinessScore` — intentional product shortcut.

| `readiness` | `recovery.readinessScore` | Recovery | Same as above | No recovery | Stale recovery | Recovery confidence | Clear | **READY** |

---

### 1.4 `fatigue`

| Field                      | Source            | Models                 | Assumptions                   | Missing when                    | Stale when                     | Confidence                       | Wording                                         | Class                                                         |
| -------------------------- | ----------------- | ---------------------- | ----------------------------- | ------------------------------- | ------------------------------ | -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `fatigue` (whole)          | Fatigue Engine v1 | `fatigue-synthesis-v1` | 14–42d history for trajectory | Engine error; short history     | New session after `computedAt` | `confidence`, `dataCompleteness` | Effort ring uses strain proxy — see dailyStrain | **READY** with history                                        |
| `fatigue.fatigueIndex`     | Fatigue model     | Fatigue                | 0–100                         | `INSUFFICIENT_DATA`             | New training load              | Model confidence                 | Mapped to Whoop-like strain for ring fallback   | **Needs refinement** — dual representation with `dailyStrain` |
| `fatigue.fatigueLevel`     | Fatigue model     | Fatigue                | Ordinal                       | Insufficient data               | Stale                          | High                             | Mapped labels OK                                | **READY**                                                     |
| `fatigue.trainingCapacity` | Fatigue model     | Fatigue                | FULL → REST_ONLY              | Insufficient                    | Stale                          | Medium                           | « Capacité » sub-metric clear                   | **READY**                                                     |
| `fatigue.trajectory`       | Fatigue model     | Fatigue                | Needs multi-day series        | Short history defaults `STABLE` | Stale                          | Low with <7d data                | Arrow in signal — OK                            | **Needs refinement** early season                             |
| `fatigue.dimensions.*`     | Fatigue model     | Fatigue                | 5 dimensions                  | Per-dimension gaps              | Stale                          | Per-dimension                    | Drill-down                                      | **READY**                                                     |
| `fatigue.computedAt`       | Engine            | —                      | —                             | —                               | —                              | High                             | Internal                                        | **READY**                                                     |

---

### 1.5 `adaptation`

| Field                                | Source               | Models                    | Assumptions              | Missing when                        | Stale when                          | Confidence                | Wording                                       | Class                                       |
| ------------------------------------ | -------------------- | ------------------------- | ------------------------ | ----------------------------------- | ----------------------------------- | ------------------------- | --------------------------------------------- | ------------------------------------------- |
| `adaptation` (whole)                 | Adaptation Engine v1 | `adaptation-synthesis-v1` | 14–42d history minimum   | Short history → `INSUFFICIENT_DATA` | Sub-models stale (not in freshness) | `confidence`; often lower | Only in effort sub-metrics, not primary ring  | **Needs refinement** — under-exposed but OK |
| `adaptation.adaptationIndex`         | Adaptation model     | Adaptation                | 0–100 index              | Insufficient history                | Not tracked in freshness            | Medium                    | « Adaptation · Positively adapting » — jargon | **Needs refinement** (wording)              |
| `adaptation.adaptationStatus`        | Adaptation model     | Adaptation                | Ordinal status           | Insufficient                        | Stale                               | Medium                    | Status labels in French OK                    | **READY**                                   |
| `adaptation.decision.loadMultiplier` | Adaptation model     | Adaptation                | Training load adjustment | Insufficient                        | Stale                               | Medium                    | Not shown on Today — OK                       | **READY** (internal)                        |

---

### 1.6 `dailyStrain`

| Field                      | Source                 | Models                                      | Assumptions                                                     | Missing when        | Stale when                               | Confidence                    | Wording                                | Class                                                                                              |
| -------------------------- | ---------------------- | ------------------------------------------- | --------------------------------------------------------------- | ------------------- | ---------------------------------------- | ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `dailyStrain` (whole)      | `computeDailyStrain()` | Feature Engine sessions + legacy activities | Session features preferred; else legacy TSS/duration heuristics | No activities today | New activity imported (not in freshness) | `confidence` field in result  | Effort ring 0–21 — athlete understands | **Needs refinement**                                                                               |
| `dailyStrain.strainScore`  | Log-scaled TSS → 0–21  | Daily strain lib                            | Whoop-like scale                                                | No load data        | New session today                        | Tier-dependent (`confidence`) | Shown as strain not TSS — OK           | **Needs refinement** — fallback to `fatigueIndexToWhoopStrain` in UI blurs fatigue vs today effort |
| `dailyStrain.dailyTss`     | Sum of session loads   | Features/legacy                             | TSS definition varies by sport                                  | No sessions         | New session                              | Tier-dependent                | Not shown on Today ring                | **READY** (internal)                                                                               |
| `dailyStrain.tier`         | Source quality         | —                                           | STRUCTURED > HR > MOVEMENT                                      | Unknown sources     | —                                        | Drives confidence             | Internal                               | **READY** (internal)                                                                               |
| `dailyStrain.fallbackUsed` | Computation trace      | —                                           | Legacy path used                                                | —                   | —                                        | Low when true                 | N/A                                    | **Should not expose yet** without athlete explanation                                              |

**Critical issue:** UI uses `dailyStrain.strainScore ?? fatigueIndexToWhoopStrain(fatigue.fatigueIndex)` — the Effort ring may show **chronic fatigue** when **today's strain** is unknown. Athlete cannot tell which.

---

### 1.7 `reasoning`

| Field                                | Source              | Models                   | Assumptions                            | Missing when                           | Stale when                         | Confidence                       | Wording                                    | Class                                                 |
| ------------------------------------ | ------------------- | ------------------------ | -------------------------------------- | -------------------------------------- | ---------------------------------- | -------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `reasoning` (whole)                  | Reasoning Engine v1 | `reasoning-synthesis-v1` | Recovery + Fatigue + Adaptation states | Sub-model missing; `INSUFFICIENT_DATA` | Any sub-model newer than reasoning | `confidence`, `dataCompleteness` | Verdict labels excellent (`today-mapping`) | **READY** when not `INSUFFICIENT_DATA`                |
| `reasoning.overallVerdict`           | Reasoning model     | Reasoning                | 7 verdict enum                         | `INSUFFICIENT_DATA`                    | Sub-model stale                    | Model confidence                 | « Entraîne-toi fort » etc. — clear         | **READY**                                             |
| `reasoning.topAction`                | Reasoning model     | Reasoning                | i18n codes (`verbCode`, `focusCode`)   | `INSUFFICIENT_DATA`; missing i18n      | Stale                              | Model confidence                 | `resolveCode()` — good                     | **READY**                                             |
| `reasoning.keyFindings`              | Reasoning model     | Reasoning                | Evidence-linked                        | Empty array                            | Stale                              | Per-finding `confidence`         | Session block « Pourquoi » — clear         | **READY**                                             |
| `reasoning.limitingFactor`           | Reasoning model     | Reasoning                | System + i18n description              | `system: null`                         | Stale                              | Model confidence                 | Not prominently shown on Today             | **Needs refinement** — under-surfaced                 |
| `reasoning.confidence`               | Reasoning model     | Reasoning                | 0–1                                    | —                                      | Stale                              | High when reasoning runs         | Not shown to athlete on Today              | **Needs refinement** — should surface when medium/low |
| `reasoning.physiologicalConsistency` | Reasoning model     | Reasoning                | Cross-model agreement                  | Insufficient models                    | Stale                              | Medium                           | Internal-ish                               | **Should not expose yet** without copy                |
| `reasoning.evidenceGraph`            | Reasoning model     | Reasoning                | Contribution weights                   | Missing                                | Stale                              | Medium                           | Not shown — OK for V1                      | **READY** (internal)                                  |
| `reasoning.computedAt`               | Engine              | —                        | —                                      | —                                      | —                                  | High                             | Narrative freshness note                   | **READY**                                             |

**Also exposed as top-level:**

| `todaysDecision` | `reasoning.overallVerdict` | Reasoning | Duplicate | No reasoning | Stale reasoning | Reasoning confidence | Verdict labels clear | **READY** |
| `limitingFactor` | `reasoning.limitingFactor` | Reasoning | Duplicate | No reasoning | Stale | Reasoning confidence | Rarely shown | **Needs refinement** |
| `confidence` | `reasoning.confidence ?? recovery.confidence` | Reasoning, Recovery | Fallback to recovery | Both null | Stale | Mixed | Not shown | **Needs refinement** |

---

### 1.8 `briefing`

| Field                  | Source                                   | Models                                   | Assumptions                         | Missing when                            | Stale when                                                | Confidence                  | Wording                            | Class                                          |
| ---------------------- | ---------------------------------------- | ---------------------------------------- | ----------------------------------- | --------------------------------------- | --------------------------------------------------------- | --------------------------- | ---------------------------------- | ---------------------------------------------- |
| `briefing.content`     | LLM via `generateDailyBriefingContent()` | Coach context + `briefing-context` + GPT | AI_GATEWAY configured; prompt rules | Coach not configured; not yet generated | New session; reasoning newer; phase change (not detected) | **Low–medium** (generative) | Natural French — good when correct | **Needs refinement**                           |
| `briefing.generatedAt` | DB `DailyBriefing`                       | —                                        | —                                   | No briefing                             | See stale rules                                           | High (timestamp)            | Freshness note under narrative     | **READY**                                      |
| `briefing.readiness`   | Garmin readiness at generation           | Legacy health                            | Snapshot of readiness at write time | Null                                    | Can diverge from `recovery.readinessScore`                | Medium                      | Not shown — OK                     | **Needs refinement** — redundant with recovery |

**Known briefing risks (observed):**

- Temporal confusion (yesterday vs today sessions) — mitigated in prompt, not guaranteed.
- TSB/readiness numbers cited from coach context (PMC), not snapshot fields — can diverge.
- No structured validation layer before persistence.

---

### 1.9 `recommendation`

| Field            | Source                                     | Models                                                        | Assumptions                        | Missing when      | Stale when      | Confidence              | Wording                   | Class     |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------- | ---------------------------------- | ----------------- | --------------- | ----------------------- | ------------------------- | --------- |
| `recommendation` | `pickRecommendation()` in snapshot-builder | Recovery / Fatigue / Adaptation via `systemAttentionPriority` | Reasoning routes to one engine rec | No sub-model recs | Sub-model stale | Source model confidence | Evidence in Session block | **READY** |

---

### 1.10 `primaryProductMessage` & `domainMessages`

| Field                   | Source                                           | Models               | Assumptions             | Missing when               | Stale when   | Confidence         | Wording                    | Class              |
| ----------------------- | ------------------------------------------------ | -------------------- | ----------------------- | -------------------------- | ------------ | ------------------ | -------------------------- | ------------------ |
| `primaryProductMessage` | Freshness messages or INSUFFICIENT_DATA fallback | Freshness heuristics | First stale domain wins | All fresh and reasoning OK | Domain stale | Medium (heuristic) | Excellent athlete language | **READY**          |
| `domainMessages`        | Per-domain `productMessage`                      | Freshness            | Map of domain → string  | Domain fresh               | Per-domain   | Medium             | Good                       | **READY** (in-app) |

Fallback copy when `INSUFFICIENT_DATA`: _« Synchronise tes appareils… »_ — still slightly technical.

---

## 2. Classification summary

### READY (safe for in-app primary experience)

- `snapshotId`, `trainingDayId`
- `recovery.*` (when not `INSUFFICIENT_DATA` / `BASELINE_PENDING`)
- `readiness` (top-level)
- `fatigue.*` (with sufficient history)
- `reasoning.overallVerdict`, `topAction`, `keyFindings`
- `todaysDecision`
- `recommendation`
- `primaryProductMessage`, `domainMessages`
- `briefing.generatedAt`
- `dailyStrain` (when `available` and no fallback)

### Needs refinement

- `freshness` (domain mapping accuracy)
- `athleteId` hardcoding
- `generatedAt` vs inference timestamps
- `adaptation.*` (wording, history gating)
- `dailyStrain` + Effort ring fallback logic
- `limitingFactor`, `confidence` (under-surfaced)
- `briefing.content` (LLM quality, phase staleness)
- `fatigue` vs `dailyStrain` dual effort semantics
- Recovery `BASELINE_PENDING` calibration UX
- « SNV », « ACWR », « TSS » acronyms in sub-metrics

### Should not expose yet (external channels)

- `freshness.domains[].state` (technical)
- `freshness.providers[]` (integration detail)
- `dailyStrain.fallbackUsed`, low-confidence strain
- `reasoning.physiologicalConsistency` (without copy)
- `briefing.content` without validation gate
- Effort ring when `strainScore` is fatigue proxy
- Any field when `overallVerdict === 'INSUFFICIENT_DATA'` as a "decision"

---

## 3. Today experience — placeholder & empty state audit

Today is **not snapshot-pure**. The dashboard still fetches in parallel:

| Fetch                          | Outside snapshot? | Risk                                               |
| ------------------------------ | ----------------- | -------------------------------------------------- |
| `useAthleteSnapshot()`         | —                 | Canonical inference                                |
| `useHealthEntries(14)`         | ✅                | Sleep/recovery rings, charts, sub-metrics          |
| `useActivities()`              | ✅                | Day summary, effort sparkline, consistency heatmap |
| `usePlannedSessions()`         | ✅                | Session block, planning row                        |
| `useAthleteProfile()`          | ✅                | Sleep target                                       |
| `useGoals()` (in SessionBlock) | ✅                | Goals strip                                        |
| `useWellnessCheckin()`         | ✅                | Morning dialog                                     |

**Consequence:** UI can show data **not reflected in snapshot freshness** (e.g. health entry arrived but snapshot not regenerated).

---

### 3.1 Placeholder inventory

| Location                           | What athlete sees                                       | Why                                                   | Root cause                                               | Layer                            |
| ---------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | -------------------------------- |
| `DashboardSkeleton`                | Grey rings + blocks                                     | First visit, no persisted snapshot                    | Cold start — no `AthleteSnapshotRecord`                  | Orchestration                    |
| `PartialSnapshotFallback`          | Message + « Actualiser »                                | `hasContent === false`                                | Inference `INSUFFICIENT_DATA`, no briefing, no readiness | Inference + missing observations |
| `SnapshotStatusBanner`             | Domain message / « Mise à jour en cours… »              | Stale or syncing domain                               | Freshness heuristic; background briefing                 | Orchestration + wording          |
| `RadialScoreCard` value `—`        | Empty ring (grey)                                       | `sleepScore`, `readinessScore`, or `strainScore` null | Missing health entry; recovery pending; no strain        | Missing observations / inference |
| Recovery ring + `BASELINE_PENDING` | Ring may show score; sub-metrics « Signaux actifs 2/4 » | Calibration period                                    | Recovery engine warming up                               | Inference (by design)            |
| Sleep sub-metrics `—`              | Durée / Profond / Paradoxal empty                       | No `todayEntry` in health API                         | Garmin sleep not synced or wrong day boundary            | Missing observations             |
| Effort sub-metrics `—`             | TSS sem. / ACWR empty                                   | `weeklyLoad === 0` or `acwr === 0`                    | No recent activities or load not computed                | Missing observations             |
| Effort ring                        | Strain from fatigue index                               | `dailyStrain` null, fatigue index used                | UI fallback in `today-metrics-row`                       | **UI** (semantic bug)            |
| `sleepSignal.label` `—`            | Neutral arrow                                           | No sleep score                                        | Missing sleep data                                       | Missing observations             |
| Narrative without briefing         | Deterministic reasoning text                            | Briefing not generated or coach off                   | Background LLM; `AI_GATEWAY`                             | Orchestration                    |
| Narrative with stale briefing      | Old text until poll                                     | Background regen in flight                            | Async briefing path                                      | Orchestration                    |
| `SessionBlock` empty               | « Aucune séance réalisée ni planifiée »                 | No activities or planned sessions today               | Legitimate empty day                                     | OK — not a bug                   |
| `ActivityConsistencyPanel`         | « Aucune série en cours »                               | `currentStreak === 0`                                 | No consecutive training weeks                            | OK — factual                     |
| `HealthMonitorPanel`               | Metrics hidden if all `—`                               | Filters empty metrics                                 | No health data                                           | Missing observations             |
| `EvolutionChart`                   | Flat / empty chart area                                 | `hasData === false`                                   | <7d health entries                                       | Missing observations             |
| `TodayGoalsStrip`                  | Empty if no goals                                       | No goals configured                                   | User hasn't set goals                                    | Product choice — OK              |
| `MorningWellnessDialog`            | Hidden when completed                                   | Wellness already submitted                            | Normal                                                   | OK                               |
| Partial Today layout               | Metrics + planning only, no narrative                   | `!reasoning?.topAction`                               | Reasoning insufficient                                   | Inference                        |
| Drill-down pages                   | Independent fetches                                     | Not audited here                                      | Same dual-plane issue                                    | UI                               |

---

## 4. Root cause distribution

```
Missing observations     ████████████  ~40%   (sleep, HRV, sessions not synced)
UI dual data plane       ██████        ~20%   (health/activities outside snapshot)
Inference gaps           █████         ~18%   (INSUFFICIENT_DATA, BASELINE_PENDING)
Orchestration/async      ████          ~14%   (briefing lag, snapshot not regen)
Wording / semantics      ███           ~8%    (effort=fatigue, acronyms)
```

---

## 5. Prioritized roadmap — eliminate placeholders

### Tier 1 — Trust breaks (do first)

| #   | Item                                    | Fixes                                                                                                                                     | Effort |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1.1 | **Effort ring semantics**               | Never show `fatigueIndex` proxy as today's effort. Show `—` + `domainMessages.training` or « Pas encore d'effort enregistré aujourd'hui » | S      |
| 1.2 | **Briefing validation gate**            | Post-LLM check: session dates must match `briefing-context` lists; reject/regen on mismatch                                               | M      |
| 1.3 | **Snapshot includes day context**       | Embed `sessionsDoneToday`, `plannedToday` in snapshot (from server) — Session block reads snapshot, not parallel fetch                    | M      |
| 1.4 | **Freshness tracks dailyStrain**        | Add strain/session load to fingerprint + `training` domain evidence                                                                       | S      |
| 1.5 | **INSUFFICIENT_DATA is not a decision** | Never expose `todaysDecision` externally when `INSUFFICIENT_DATA`; in-app show `primaryProductMessage` only                               | S      |

### Tier 2 — Placeholder elimination (in-app polish)

| #   | Item                                               | Fixes                                                                                    | Effort |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| 2.1 | **Sleep ring without raw health fetch**            | Put `sleepScore`, `sleepSubMetrics` in snapshot (computed server-side from observations) | M      |
| 2.2 | **Unified sub-metrics in snapshot**                | `recoverySubMetrics`, `effortSubMetrics` as snapshot fields — single source              | M      |
| 2.3 | **Remove `DashboardSkeleton` for returning users** | Persist last snapshot to client storage (IndexedDB) for instant paint                    | M      |
| 2.4 | **Briefing phase staleness**                       | Mark recommendations stale when `resolveBriefingPhase(now) !== phaseAtGeneration`        | S      |
| 2.5 | **Surface `confidence` when < 0.6**                | Subtle narrative line: « Estimation partielle — données incomplètes »                    | S      |
| 2.6 | **Surface `limitingFactor`**                       | One line under narrative when actionable                                                 | S      |
| 2.7 | **Replace acronyms**                               | SNV → « Variabilité cardiaque », expose ACWR only in drill-down                          | S      |
| 2.8 | **Partial layout upgrade**                         | When no `topAction` but briefing exists → show full layout with briefing-only narrative  | S      |

### Tier 3 — Snapshot completeness

| #   | Item                                 | Fixes                                                                        | Effort |
| --- | ------------------------------------ | ---------------------------------------------------------------------------- | ------ |
| 3.1 | **Snapshot health strip**            | 14d sparkline data as optional snapshot extension                            | L      |
| 3.2 | **Snapshot planning slice**          | Today's planned sessions in snapshot                                         | M      |
| 3.3 | **Eliminate parallel Today fetches** | VM reads snapshot only; background refresh updates all sections              | L      |
| 3.4 | **`generatedAt` vs `inferenceAt`**   | Expose both; athlete sees « Mis à jour il y a 2h » based on inference        | S      |
| 3.5 | **Adaptation exposure decision**     | Either add 4th ring or remove adaptation from effort sub-metrics until ready | M      |

### Tier 4 — External exposure gate

Only after Tier 1 + Tier 2 complete:

| #   | Gate                            | Criteria                                                                    |
| --- | ------------------------------- | --------------------------------------------------------------------------- |
| 4.1 | **Snapshot contract tests**     | Golden-file tests per field classification                                  |
| 4.2 | **Briefing determinism bounds** | Structured fields (sessions, readiness) from snapshot; LLM only for prose   |
| 4.3 | **Notification payload**        | `todaysDecision` + `briefing` excerpt + `confidence ≥ 0.6` + `overallFresh` |
| 4.4 | **Widget payload**              | Rings from snapshot only; no client recomputation                           |
| 4.5 | **Watch complications**         | `readiness` + `todaysDecision` + `limitingFactor` — 3 fields max            |

---

## 6. Definition of done — Snapshot Quality V1

The athlete never wonders if SHARPIT knows what it's doing when:

- [ ] Opening Today always shows **meaningful content** (snapshot or explicit domain message — never blank rings without explanation)
- [ ] **Effort** always means **today's effort**, never chronic fatigue
- [ ] **Briefing** respects today/yesterday session boundaries (validated)
- [ ] **Briefing** updates after mid-day session without manual refresh
- [ ] **All primary metrics** come from one snapshot response
- [ ] **INSUFFICIENT_DATA** never looks like a training decision
- [ ] **Confidence < 0.6** is visible to the athlete
- [ ] **Zero parallel fetches** for inference-grade data on Today
- [ ] **Field-level contract tests** pass for all READY fields
- [ ] **7 consecutive days** dogfooded without placeholder confusion

---

## 7. Recommended immediate next sprint (2 weeks)

1. Fix effort ring semantics (1.1)
2. Briefing validation gate (1.2)
3. Embed day sessions in snapshot (1.3)
4. Briefing phase staleness (2.4)
5. Confidence + limiting factor surfacing (2.5, 2.6)

This gets the Snapshot to **in-app production quality** without touching notifications or widgets.

---

## 8. What we deliberately defer

- Push notifications, widgets, Apple Watch, lock screen
- New physiological models or metrics
- Today visual redesign
- Multi-athlete `athleteId`

The Snapshot must earn trust **inside the app** first.
