/**
 * Which `DailyNutrition` row speaks for a day (ADR-061). The athlete's own log in SHARPIT wins;
 * another provider (MyFitnessPal) fills a day only when SHARPIT has nothing for it, so a meal
 * logged in both is never counted twice. An imported MyFitnessPal export comes last (ADR-062):
 * it only carries meal totals, where a live sync carries each food.
 */

export const SHARPIT_NUTRITION_PROVIDER = 'sharpit';
export const MFP_IMPORT_NUTRITION_PROVIDER = 'myfitnesspal_import';

type ProviderRow = { provider: string };
type DatedProviderRow = ProviderRow & { date: Date };

function rank(row: ProviderRow): number {
  if (row.provider === SHARPIT_NUTRITION_PROVIDER) {
    return 0;
  }
  return row.provider === MFP_IMPORT_NUTRITION_PROVIDER ? 2 : 1;
}

/** The row that speaks for one day, among that day's rows. */
export function pickNutritionRow<Row extends ProviderRow>(rows: readonly Row[]): Row | null {
  return [...rows].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** One row per day across a range, keeping the input order of the days. */
export function dedupeNutritionRowsByDay<Row extends DatedProviderRow>(
  rows: readonly Row[],
): Row[] {
  const byDay = new Map<string, Row>();
  for (const row of rows) {
    const day = row.date.toISOString().slice(0, 10);
    const current = byDay.get(day);
    if (!current || rank(row) < rank(current)) {
      byDay.set(day, row);
    }
  }
  const kept = new Set(byDay.values());
  return rows.filter((row) => kept.has(row));
}
