# ADR-062: MyFitnessPal history comes from the athlete's own export

**Status:** Accepted
**Date:** 2026-10-01
**Author:** Augustin Briolon (with Claude Code)
**Supersedes:** N/A

---

## Context

ADR-061 moved the food log into SHARPIT. The MyFitnessPal sync stays an unofficial,
session-cookie access: App Review 5.2.2 needs an official link to a third-party service, which
MFP does not offer, and SHARPIT means to drop MFP. Athletes leaving MFP still want their history.

MFP offers one official way out: Reports → Export (Premium), a ZIP emailed to the athlete. Its
nutrition CSV holds **one row per meal per day** — date, meal, calories, macros, micros, note — and
no food detail. Headers follow the account's language (English or French), and a CSV re-saved
from a French spreadsheet uses semicolons and decimal commas.

The same session also asked for two food-log changes: targets split in percent (summing to 100),
and the athlete's own foods listed, edited and deleted.

---

## Decision

1. **Import the export, never the account.** `POST /api/(v1/)food-log/import/myfitnesspal` takes
   the ZIP or its nutrition CSV (multipart `file`, ≤ 4 MB, 5 imports/hour). The server unzips
   (`fflate`), picks the nutrition CSV, and `readMfpNutritionCsv` (pure, `packages/app`) maps
   English or French headers, comma or semicolon, ISO or day-first dates (month-first only when a
   date proves it), and the four meals in either language. Rows without a date or calories are
   counted as skipped.
2. **Days land as `DailyNutrition` rows of their own provider, `myfitnesspal_import`**, meal totals
   in `meals` with no entries. Every reader already shows such a day read-only. `pickNutritionRow`
   ranks it last: the SHARPIT log, then a live MFP sync (which carries foods), then the import.
3. **Re-importing replaces the previous import** (delete + create in one transaction), so a wider
   export never doubles a day.
4. **FUEL and the coach get the last 60 days** that no other source covers, as NUTRITION
   observations (`source: MYFITNESSPAL`). Older days stay visible without recomputing years of
   features.
5. **The iPhone app drops the MFP connection** (iOS ADR 0010); the web sync stays until it is
   removed. The import is offered on both.
6. **Targets in percent**: `nutritionTargetMode` (`GRAMS` | `PERCENT`) and three integer shares.
   In `PERCENT` the calories are required and the shares must sum to exactly 100 (validator). The
   server stores the grams too (4/4/9 kcal per gram), so every reader keeps reading grams.
7. **Own foods**: `GET /foods/mine`, `PATCH|DELETE /foods/[id]`, scoped to `ownerId` and
   `source: CUSTOM` (404 otherwise). Logged entries keep their snapshot (ADR-061 §2); a deleted
   food leaves its entries unlinked.

---

## Rationale

- The export is the athlete's data handed over by MFP itself: no credentials, no unofficial API,
  nothing for App Review to object to.
- A separate provider keeps the import from fighting a live sync or the in-app log over a day, and
  lets a re-import replace exactly what it wrote.

---

## Alternatives Considered

### Alternative 1: Read the athlete's MFP account (session cookie, `foods/mine`)

- **Pros:** food-level detail and custom foods, no file to handle.
- **Cons:** unofficial access, the reason MFP is being removed; rejected by App Review 5.2.2.
- **Why rejected:** only kept as a local one-off script for the author's own account, never shipped.

### Alternative 2: Parse the free printable report (PDF)

- **Pros:** available without Premium.
- **Cons:** layout-dependent text extraction, fragile across locales and MFP redesigns.
- **Why rejected:** an unreliable importer is worse than none.

### Alternative 3: Turn each imported meal into `FoodLogEntry` rows

- **Pros:** imported days become editable.
- **Cons:** fake « foods » named after meals, years of rows, and the export has no weights.
- **Why rejected:** the read-only day is honest about what the export holds.

---

## Consequences

### Positive

- An athlete leaves MFP with their history: page, history chart and coach context keep it.
- Targets read in grams or percent; own foods are managed in one place.

### Negative

- Food-level history is lost: the export only has meal totals.
- Free MFP accounts cannot export; they keep only what they log from now on.
- FUEL is not recomputed for imported days older than 60 days.

### Neutral

- New provider string `myfitnesspal_import`, new enum `NutritionTargetMode`, migration
  `20261001170000_nutrition_target_split`, dependency `fflate`.
