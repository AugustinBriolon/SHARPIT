# ADR-061: The food log lives in SHARPIT

**Status:** Accepted
**Date:** 2026-10-01
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A

---

## Context

Nutrition came only from MyFitnessPal, through an unofficial session-token integration: App
Review 5.2.2 risk, a sync the athlete cannot rely on, and no way to log a meal in SHARPIT itself.
The athlete asked to replace it with an in-app log: barcode scanner, food search, meals, targets.

Everything downstream already reads one shape: a `DailyNutrition` row per day (totals, `meals`
JSON, `goal*`), plus a NUTRITION observation that invalidates Core's FUEL features. Readers: the
Nutrition page and Today card (web), `/api/v1/nutrition` (iOS screen and widget), the nutrition
day analysis, the coach context, the journal's day signals, the data-days calendar.

---

## Decision

1. **Entries are the source.** `FoodLogEntry` (day, meal, grams, nutrient snapshot) is what the
   athlete writes. On every change, `recomputeFoodLogDay` rebuilds that day's `DailyNutrition` row
   with `provider: 'sharpit'` and ingests a `NUTRITION` observation (`source: MANUAL`). Every reader
   keeps working unchanged.
2. **Nutrients are snapshotted on the entry.** A product refreshed later never rewrites a past day.
3. **Foods: Open Food Facts, cached, plus the athlete's own.** `FoodProduct` holds OFF products by
   barcode (`source: OFF`, shared, refreshed after 30 days) and custom foods (`source: CUSTOM`,
   `ownerId`). OFF is called from the server only (barcode `/api/v2/product`, search
   `search.openfoodfacts.org`), with a named User-Agent; the device never talks to OFF, so OFF never
   learns who scanned what. Attribution « Données Open Food Facts (ODbL) » is shown where a product
   is picked. A per-athlete limit (20/min) protects the shared OFF quota.
4. **SHARPIT wins a day.** When a day has both a `sharpit` and a `myfitnesspal` row,
   `pickNutritionRow` / `dedupeNutritionRowsByDay` keep SHARPIT in every reader; MFP fills only
   days SHARPIT has nothing for, so a meal logged twice is never counted twice.
5. **Targets are the athlete's own**, typed in (`AthleteProfile.nutritionTarget*`), copied onto
   each SHARPIT day row's `goal*` so the goals, the widget dial and the analysis budget read them.
6. **The page is never a « connect a provider » wall.** `connected` is true for everyone;
   `mfpConnected` only adds the MFP sync action.
7. **Surface**: `/api/food-log` (+ `/api/v1/food-log`): day read, add, patch, delete; foods search,
   barcode, custom food; targets. Open to every tier — the log is the athlete's data
   (pro-gating principle); only the coach's reading of it stays Pro.
8. **The coach reads the plate**: a `nutrition` context section, in the nutrition and general
   scopes.

---

## Rationale

- Projecting into the existing row keeps the change additive: no reader rewritten, FUEL and the
  watermark rebuild already react to the row and the observation.
- Server-side OFF calls keep personal data out of a third party and let one cache serve everyone.

---

## Alternatives Considered

### Alternative 1: Readers read `FoodLogEntry` directly

- **Pros:** one source of truth, no projection.
- **Cons:** six readers rewritten, the MFP path kept in parallel, FUEL ingestion redone.
- **Why rejected:** large change for no athlete-visible gain.

### Alternative 2: Call Open Food Facts from the phone

- **Pros:** no server cache, no shared quota.
- **Cons:** OFF sees every athlete's IP and scans; no shared cache; the web needs a second path.
- **Why rejected:** privacy and duplication.

### Alternative 3: Sum SHARPIT and MFP rows

- **Pros:** nothing hidden.
- **Cons:** a meal logged in both counts twice.
- **Why rejected:** wrong totals are worse than a hidden fallback.

---

## Consequences

### Positive

- The athlete logs meals in SHARPIT, scanned or searched, with their own targets.
- MyFitnessPal can be removed later without touching any reader.

### Negative

- Two tables to keep in step: an entry write that fails after the row upsert leaves the row stale
  until the next change (the write itself is never lost).
- OFF data quality varies; half-filled products are refused rather than logged as zero.

### Scientific debt created

- Targets are not derived from load or body composition; a suggested target is future work.

---

## Review Criteria

- When MFP has no active athlete, remove the integration and the fallback.
- If OFF rate limits bite, cache search results longer or self-host a dump.
