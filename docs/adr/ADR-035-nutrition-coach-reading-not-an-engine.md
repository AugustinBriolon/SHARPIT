# ADR-035: Nutrition day analysis is a coach reading, not a Nutrition Engine

**Status:** Accepted  
**Date:** 2026-09-11  
**Author:** Augustin Briolon (with Claude Code)  
**Supersedes:** N/A  
**Related:** [NUTRITION_DAY_ANALYSIS.md](../product/NUTRITION_DAY_ANALYSIS.md), [ADR-010](./ADR-010-cache-components-and-instant-navigation.md), [ADR-026](./ADR-026-public-demo-mode.md)

---

## Context

`/nutrition` restated what the athlete ate: totals, goals, meals and a macro trend. Nothing interpreted the day, and the coach only received four totals. The athlete asked for a daily reading of their meals that uses the products themselves and knows their declared diet (keto, vegetarian…) and their weight goal.

Constraints:

- `CORE_ARCHITECTURE.md` lists the Nutrition Engine as EXPERIMENTAL. It "requires decision-gap analysis + ADR" before it is built.
- The frozen `fuel` feature extractor states that judging whether a day was well fuelled "belongs to an engine the architecture has not approved".
- `PRODUCT.md`: a capability ships only if it improves the athlete's next decision, and the athlete stays the decision-maker.
- The page must never wait on a model (Instant UX, Background tier).
- The diet already lives in `AthleteProfile.journalPrefs`. No weight target existed.

---

## Decision

Build the daily nutrition analysis as a **coach reading**: the same class as the activity narrative. It is **not** a Nutrition Engine.

1. **No engine output.**
   - It produces no score.
   - Nothing reads it in Core, the `AthleteSnapshot` or the Decision Engine.
   - Nothing reads it to plan or adapt training.
2. **Deterministic facts, model phrasing.**
   - `src/lib/nutrition/analysis/nutrition-analysis-facts.ts` computes every number: per-kg ratios against consensus bands, protein per meal, fibre, sugar share, diet conflicts, and weight-goal energy balance.
   - The model (`COACH_MODEL`, zod-structured output) interprets and phrases. It quotes no number that is not in the facts.
   - The bands live in one module, `nutrition-analysis-bands.ts`.
3. **Stored and keyed by facts.**
   - Storage: one `NutritionDayAnalysis` row per (athlete, day).
   - Key: a sha256 of the facts (plus a prompt version).
   - A reading is regenerated only when that hash changes.
   - An `attemptHash` / `attemptedAt` claim dedupes concurrent requests, and a failed attempt is not retried for an hour.
4. **Generated behind the response.**
   - `GET /api/presentation/nutrition` answers `pending` and schedules generation with `after()`.
   - The client polls every 4 s only while the reading is `pending` or `refreshing`.
   - Phase 1 reads **finished days** only. For today the page says it will read the day once it is over.
5. **Diet has a single source.** The page reads the journal preferences through `activeDietIds` / `activeDietLabels`. The diet tag links back to the journal drawer (`?personnaliser=nutrition`).
6. **A declared low-carb diet replaces the endurance carbohydrate band.**
   - The keto (50 g) or low-carb (130 g) ceiling becomes the reference.
   - The reading never recommends exceeding it.
7. **Weight target is an optional profile attribute** (`AthleteProfile.targetWeightKg`), edited next to height and the sleep target in Réglages → Profil.
8. **Gates.** Generation needs the coach to be configured and the athlete's AI-processing consent. It never runs in a demo session.

---

## Rationale

- **It fits an existing class.** The activity narrative already established "advisory, frozen, model-phrased reading over deterministic facts". The architecture accepts that class, and the athlete stays in charge.
- **The facts can be tested and bound the model.** The facts are pure and unit-tested, and they carry every figure. That prevents invented numbers and keeps the science in one reviewable module.
- **Hash-keyed storage is cheap and stable.** A past day costs one call and stays readable forever. A late MyFitnessPal edit regenerates it, and nothing else does.
- **The page never waits.** `after()` plus polling keeps the response fast; the same pattern already serves the activity narrative.
- **The keto rule came from real data.** The first real day tested (keto athlete, 100 min of training) came out at 0.81 g/kg of carbohydrate against a 6–10 g/kg band. Without the rule, the reading would have pushed the athlete off their chosen diet.

---

## Alternatives Considered

### Alternative 1: A Nutrition Engine (score + Snapshot input)

**Description:** Compute a daily fuelling score and feed it to the Snapshot and the Decision Engine (e.g. "under-fuelled → lighter session").

**Pros:**

- Nutrition would influence training decisions directly.

**Cons:**

- Requires constitutional review.
- Creates a new scoring engine during stabilisation.
- MyFitnessPal logging is incomplete too often to drive training changes.

**Rejected because:** the constitution gates it, and the decision gap is served without it. If that need appears, it goes to constitutional review.

### Alternative 2: Generate on every page view, no storage

**Description:** Call the model on each view and cache in memory.

**Pros:**

- No schema change.

**Cons:**

- Pays for the model on every view.
- The page waits, or flickers between readings.
- The coach cannot reuse the reading.

**Rejected because:** cost and Instant UX both forbid it.

### Alternative 3: Let the model compute the numbers from the raw diary

**Description:** Send the raw meals and ask for ratios and verdicts.

**Pros:**

- Less code.

**Cons:**

- Numbers become unverifiable.
- Bands drift between prompts.
- Nothing can be unit-tested.

**Rejected because:** SHARPIT never shows a number without a model behind it.

---

## Consequences

### Positive

- A daily, product-aware reading that respects the declared diet and the weight goal.
- One stored reading per day that the coach can read (phase 3) without paying again.
- The weight target now exists for other surfaces (Corps) to use later.

### Negative

- Today gets no reading until phase 2 (`PROVISIONAL` readings with throttling).
- The diet lexicon is conservative, keyword-based and French/English only. The model catches what it misses.
- Changing the prompt version marks every stored reading stale. They regenerate only when viewed.

### Scientific debt created

- The consensus bands (IOC 2011 / ACSM 2016 carbohydrate, ISSN 2017 protein, EFSA fibre) are generic. `sharpit-performance-scientist` should review them before phase 3 exposes the reading to the coach.
- The sugar watch threshold (20 % of energy, total sugar) is a pragmatic proxy. MyFitnessPal reports total sugar, not free sugar.

---

## Review Criteria

- If the athlete or the coach needs the reading to change training, open the Nutrition Engine constitutional review instead of extending this vertical.
- If the gateway failure rate for this call exceeds 5 %, surface a manual "Relancer" action.
- If product conflicts show false positives in athlete feedback, tighten the lexicon or leave product conflicts to the model alone.
