# Nutrition Day Analysis — Coach Reading of the Athlete's Meals

> **Status:** Phase 1 implemented (finished days, diet tag, weight target) — [ADR-035](../adr/ADR-035-nutrition-coach-reading-not-an-engine.md)
> **Architecture:** Coach IA vertical (EVOLVING) + Presentation Layer — **not** a Nutrition Engine
> **Engine dependency:** none new. Reads the frozen `fuel` feature extractor.

---

## Mission

Today `/nutrition` restates what the athlete ate: totals, goals, meals and the macro trend. Nothing interprets it. The coach receives only the day's four totals (`loadNutritionSummary` in `coach-context.ts`).

This vertical adds a daily **coach reading of the meals**. It uses the logged products, not only the totals, and it knows the athlete's declared diet.

---

## Decision-gap analysis

`CORE_ARCHITECTURE.md` gates any Nutrition Engine behind a decision-gap analysis. It also says a capability ships only if it improves the athlete's next decision (`PRODUCT.md`). Each job below names the decision it serves.

| Job                 | Question the athlete has                                       | Decision it changes                                                                     |
| ------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Fuel vs load**    | "Did I fuel yesterday's session? Am I fuelled for tomorrow's?" | What to add or cut tonight / tomorrow (carbs around a hard session, protein for repair) |
| **Product quality** | "What are my products worth?"                                  | Which products to swap (ultra-processed, poor protein sources, low fibre, added sugar)  |
| **Diet compliance** | "Does what I ate fit the diet I chose?"                        | Fix the conflicts; watch the at-risk nutrients of that diet                             |
| **Weight goal**     | "Does my intake match my body-composition target?"             | Adjust the deficit or surplus                                                           |
| **Diet inference**  | (no declared diet) "Am I, in practice, following a diet?"      | Declare it, so every later reading is relevant                                          |

### Why this is not a Nutrition Engine

- It produces **no score**, and it feeds neither the `AthleteSnapshot` nor the Decision Engine.
- The deterministic part only restates facts: per-kg ratios come from the frozen `fuel` extractor, and diet conflicts are plain rule checks.
- The judgement is a **coach reading**, the same class as the activity narrative (`Activity.narrativeAnalysis`). It is advisory and frozen once generated. The athlete stays the decision-maker.

If a later need requires the reading to influence training decisions (for example "under-fuelled → lighter session"), that is a Nutrition Engine and goes to constitutional review.

---

## Scope

### In scope

1. **Daily analysis on two days:**
   - **Yesterday — `FINAL`.** Generated once the day is over, then frozen in the database.
   - **Today — `PROVISIONAL`.** Guides the rest of the day ("il te manque ~40 g de protéines ce soir"), refreshed in the background when new meals arrive.
2. **Format on `/nutrition`:** one verdict, 2–3 findings with their numbers, one concrete action.
3. **Declared diet on the page:**
   - The diet tag sits under the hero ("Végétarien"). Tapping it opens the same diet preferences the journal uses.
   - Source of truth: `AthleteProfile.journalPrefs`, via `activeDietLabels()`. No second diet store.
4. **Flagged products:**
   - A small marker on a meal entry, with a text label (§11.3): "hors régime", "ultra-transformé".
5. **Coach memory:**
   - The coach chat and the morning brief read the stored analysis (yesterday final, today provisional) as context. They never regenerate it.
   - A "Discuter avec le coach" entry point sits on the analysis block.
6. **Diet inference (no diet declared):**
   - **When:** the coach evaluates the logged products over a **14-day** window, and only if at least **7 days** are logged.
   - **What:** if one diet is flagrant with **confidence ≥ 0.75**, the coach _asks_: "Tes repas des 14 derniers jours ressemblent à un régime végétarien. Le déclarer ?"
   - **Never set silently** (`PRODUCT.md`: explicit approval). If the athlete says no, the coach does not ask again for 30 days.

### Out of scope

- Any Core engine, nutrition score, or Snapshot / Decision Engine input.
- Medical or clinical advice. At-risk nutrients are "à surveiller", never a deficiency diagnosis; the physician stays authoritative.
- Micronutrient amounts MyFitnessPal does not provide. Product-based hints are labelled as probable.
- Meal photo recognition, and logging food in SHARPIT itself.

---

## Pipeline

```
DailyNutrition (totals + meals[].entries[] from MyFitnessPal)
  + declared diet            (journalPrefs → activeDietLabels)
  + fuel features            (frozen core/features/extractors/fuel-extractor — read only)
  + day load / next session  (existing effort presentation + PlannedSession)
  + weight goal              (dependency — see open questions)
        ↓
Deterministic facts          src/lib/nutrition/analysis/facts.ts   (pure, unit-tested)
        ↓
LLM reading                  COACH_MODEL via AI Gateway, zod-structured output
        ↓
NutritionDayAnalysis row     frozen per (athlete, day); regenerated only on input change
        ↓
NutritionViewModel.analysis  presentation — /nutrition block, coach context
```

The model never invents a number. Every figure in the reading comes from the facts, and the prompt receives them as fixed values. This follows the activity narrative's split (`activity-narrative-facts.ts` → prompt → schema).

---

## Data model

`NutritionDayAnalysis` (built in phase 1) — one row per athlete and day:

| Field                         | Role                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `status`                      | `FINAL` for a finished day; `PROVISIONAL` reserved for phase 2 (today)               |
| `inputHash`                   | sha256 of the facts + prompt version the stored reading came from                    |
| `facts` / `analysis`          | Deterministic facts fed to the model / its validated output                          |
| `model` / `generatedAt`       | Provenance                                                                           |
| `attemptHash` / `attemptedAt` | Generation claim: dedupes concurrent requests (2 min), backs off 1 h after a failure |

The diet in force is part of the facts, so it is part of the hash. `AthleteProfile.targetWeightKg` (optional) holds the weight target.

`NutritionDietSuggestion` (phase 4, not built): `dietId`, `confidence`, `windowFrom` / `windowTo`, `status` (`PENDING | ACCEPTED | DISMISSED`), `resolvedAt`.

### Output schema (zod)

- `verdict`: `{ headline, tone: 'on_track' | 'watch' | 'off_track' }`
- `findings` (1–3; one only when the day is barely logged): `{ job: 'fuel' | 'quality' | 'diet' | 'weight', text }`. Every figure in `text` comes from the facts.
- `action`: `{ text }`
- `flaggedEntries`: `{ meal, entry, reason: 'diet_conflict' | 'ultra_processed' }[]` — stored now, shown in phase 2

---

## Generation lifecycle and cost

| Day       | Trigger                                                                         | Regenerates when                         | Bound                   |
| --------- | ------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------- |
| Past day  | Lazily when `/nutrition` opens on that day (phase 1); cron after sync (phase 2) | `inputHash` changes (late MFP edit)      | 1 call, rarely 2        |
| Today     | Background when `/nutrition` opens and the hash changed                         | Hash changed **and** ≥ 30 min since last | A few calls per day max |
| Inference | Weekly, only when no diet is declared                                           | —                                        | 1 call per week max     |

- The page never waits for the model (Instant UX, Background tier). `GET /api/presentation/nutrition` answers `pending`, schedules the generation with `after()`, and the client polls every 4 s while the reading is pending or refreshing.
- A changed hash keeps the previous reading visible ("Mise à jour…") until the new one lands.
- Generation needs the coach configured and the AI-processing consent; demo sessions never generate.
- A day with no logged entry gets no analysis.

---

## UI (inside `DESIGN_LANGUAGE.md`)

- **Hero:** the diet tag under the date strip. With no declared diet there is no tag, only the inference prompt when it exists.
- **"Lecture du coach" block, right under the hero:**
  - Verdict (one dominant line), 2–3 finding rows, one action.
  - A "Journée en cours" label while `PROVISIONAL`.
  - "Discuter avec le coach" in the footer.
- **Meals section:** marker + label on flagged entries.
- **Diet inference card:** one question with two actions ("Déclarer" / "Non merci"). It is never a banner.

---

## Scientific guardrails

| Fact                          | Proposed reference                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carbohydrate by load          | ~3–5 g/kg light day, 5–7 moderate, 6–10 high (IOC / ACSM consensus bands)                                                                                   |
| Protein                       | 1.6–2.2 g/kg/day, spread ~0.3–0.4 g/kg per meal                                                                                                             |
| Ketogenic / low carb          | Carbohydrate ≤ 50 g/day / ≤ 130 g/day. When declared, this ceiling **replaces** the endurance carbohydrate band — the reading never recommends exceeding it |
| Fibre / sugar                 | ≥ 25 g fibre/day (EFSA); total sugar above 20 % of energy is flagged                                                                                        |
| Vegetarian / vegan watch list | B12, iron, omega-3 (EPA/DHA), calcium, iodine — "à surveiller", never a diagnosis                                                                           |

The bands live in `src/lib/nutrition/analysis/nutrition-analysis-bands.ts`. A `sharpit-performance-scientist` review is due before phase 3 exposes the reading to the coach.

---

## Decisions (formerly open questions)

1. **Weight goal:** an optional `AthleteProfile.targetWeightKg`, edited in Réglages → Profil next to height and the sleep target. Shipped in phase 1.
2. **Diet list:** unchanged for now (low carb, keto, gluten-free, dairy-free, vegetarian, vegan).
3. **Diet inference window:** at least 7 logged days inside a 14-day window, confidence ≥ 0.75.
4. **Model:** `COACH_MODEL` with the analysis gateway options (Anthropic / OpenAI fallback).

---

## Delivery phases

1. **Foundation — done:**
   - Facts module and tests.
   - `NutritionDayAnalysis` table.
   - `FINAL` analysis of finished days.
   - "Lecture du coach" block and the diet tag.
   - Optional weight target.
2. **Today:** `PROVISIONAL` analysis, throttling, flagged entries in the meal list.
3. **Coach:** analysis in `coach-context.ts` and the morning brief, plus the "Discuter avec le coach" entry point.
4. **Diet inference:** `NutritionDietSuggestion`, weekly evaluation, the inference card.

Each phase ships on its own, with its tests. ADR-035 records the "coach reading, not an engine" classification.
