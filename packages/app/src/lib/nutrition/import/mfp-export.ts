import { parseCsv } from './csv';

/**
 * Reads the nutrition file of a MyFitnessPal export (ADR-062): Reports → Export, emailed as a
 * ZIP. It holds one row per meal per day — the foods themselves are not exported — with English
 * or French headers depending on the account's language. Pure: the ZIP is opened by the server.
 */

export type ImportedMeal = {
  /** The name `meal-display` labels: breakfast, lunch, dinner, snacks — or the export's own. */
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  entries: [];
};

export type ImportedDay = { date: string; meals: ImportedMeal[] };

export type MfpExportReading = { days: ImportedDay[]; skippedRows: number };

export class MfpExportFormatError extends Error {}

type Column = 'date' | 'meal' | 'calories' | 'fat' | 'carbs' | 'protein' | 'fiber' | 'sugar';

/** Header stems, matched without accents or case. The first column a stem matches wins. */
const COLUMN_STEMS: Record<Column, readonly string[]> = {
  date: ['date'],
  meal: ['meal', 'repas'],
  calories: ['calories', 'energie', 'kcal'],
  fat: ['fat', 'lipides', 'matieres grasses', 'graisses'],
  carbs: ['carbohydrates', 'carbs', 'glucides'],
  protein: ['protein', 'proteines'],
  fiber: ['fiber', 'fibre'],
  sugar: ['sugar', 'sucre'],
};

/** Fat sub-types share the stem: only the total is read. */
const FAT_SUBTYPES = ['satur', 'poly', 'mono', 'trans'];

const MEAL_NAMES: ReadonlyArray<[string, readonly string[]]> = [
  ['breakfast', ['breakfast', 'petit']],
  ['lunch', ['lunch', 'dejeuner']],
  ['dinner', ['dinner', 'diner']],
  ['snacks', ['snack', 'collation', 'en-cas', 'encas', 'gouter']],
];

export function normalizeHeader(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchesColumn(header: string, column: Column): boolean {
  const stems = COLUMN_STEMS[column];
  if (!stems.some((stem) => header.startsWith(stem))) {
    return false;
  }
  return column !== 'fat' || !FAT_SUBTYPES.some((subtype) => header.includes(subtype));
}

export function mapColumns(headers: readonly string[]): Partial<Record<Column, number>> {
  const normalized = headers.map(normalizeHeader);
  const columns: Partial<Record<Column, number>> = {};
  for (const column of Object.keys(COLUMN_STEMS) as Column[]) {
    const index = normalized.findIndex((header) => matchesColumn(header, column));
    if (index !== -1) {
      columns[column] = index;
    }
  }
  return columns;
}

/** `1 234,5`, `1,234.5`, `1234.5` — a blank or unreadable value is null. */
export function parseLocaleNumber(raw: string | undefined): number | null {
  const compact = (raw ?? '').replace(/[\s\u00a0\u202f]/g, '');
  if (compact === '') {
    return null;
  }
  const decimal = compact.includes('.') ? compact.replace(/,/g, '') : compact.replace(',', '.');
  const value = Number(decimal);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function mealName(raw: string): string {
  const key = normalizeHeader(raw);
  return MEAL_NAMES.find(([, stems]) => stems.some((stem) => key.startsWith(stem)))?.[0] ?? key;
}

type DateOrder = 'DMY' | 'MDY';

const SLASHED = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

/** Day first unless a second part above 12 proves the export is month first. */
export function detectDateOrder(rawDates: readonly string[]): DateOrder {
  const monthFirst = rawDates.some((raw) => Number(SLASHED.exec(raw.trim())?.[2]) > 12);
  return monthFirst ? 'MDY' : 'DMY';
}

const pad = (value: string) => value.padStart(2, '0');

export function parseExportDate(raw: string, order: DateOrder): string | null {
  const text = raw.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) {
    return `${iso[1]}-${pad(iso[2]!)}-${pad(iso[3]!)}`;
  }
  const slashed = SLASHED.exec(text);
  if (!slashed) {
    return null;
  }
  const [day, month] = order === 'DMY' ? [slashed[1]!, slashed[2]!] : [slashed[2]!, slashed[1]!];
  const date = `${slashed[3]}-${pad(month)}-${pad(day)}`;
  return Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? null : date;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

type Row = readonly string[];

function rowMeal(row: Row, columns: Partial<Record<Column, number>>): ImportedMeal | null {
  const read = (column: Column) =>
    columns[column] === undefined ? null : parseLocaleNumber(row[columns[column]!]);
  const calories = read('calories');
  if (calories === null) {
    return null;
  }
  return {
    name: mealName(row[columns.meal!] ?? ''),
    calories,
    protein: read('protein') ?? 0,
    carbs: read('carbs') ?? 0,
    fat: read('fat') ?? 0,
    fiber: read('fiber'),
    sugar: read('sugar'),
    entries: [],
  };
}

const addOptional = (a: number | null, b: number | null) =>
  a === null && b === null ? null : round1((a ?? 0) + (b ?? 0));

/** Two rows for one meal of one day (a meal logged at two times) add up. */
function mergeMeal(into: ImportedMeal, meal: ImportedMeal): ImportedMeal {
  return {
    ...into,
    calories: round1(into.calories + meal.calories),
    protein: round1(into.protein + meal.protein),
    carbs: round1(into.carbs + meal.carbs),
    fat: round1(into.fat + meal.fat),
    fiber: addOptional(into.fiber, meal.fiber),
    sugar: addOptional(into.sugar, meal.sugar),
  };
}

function assertColumns(columns: Partial<Record<Column, number>>) {
  if (columns.date === undefined || columns.meal === undefined || columns.calories === undefined) {
    throw new MfpExportFormatError(
      'Ce fichier ne ressemble pas à un export MyFitnessPal : il lui faut les colonnes Date, Repas et Calories.',
    );
  }
}

function groupByDay(rows: readonly Row[], columns: Partial<Record<Column, number>>) {
  const order = detectDateOrder(rows.map((row) => row[columns.date!] ?? ''));
  const days = new Map<string, Map<string, ImportedMeal>>();
  let skippedRows = 0;
  for (const row of rows) {
    const date = parseExportDate(row[columns.date!] ?? '', order);
    const meal = rowMeal(row, columns);
    if (!date || !meal) {
      skippedRows += 1;
      continue;
    }
    const meals = days.get(date) ?? new Map<string, ImportedMeal>();
    const current = meals.get(meal.name);
    meals.set(meal.name, current ? mergeMeal(current, meal) : meal);
    days.set(date, meals);
  }
  return { days, skippedRows };
}

export function readMfpNutritionCsv(text: string): MfpExportReading {
  const [headers, ...rows] = parseCsv(text);
  const columns = mapColumns(headers ?? []);
  assertColumns(columns);
  const { days, skippedRows } = groupByDay(rows, columns);
  return {
    days: [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, meals]) => ({ date, meals: [...meals.values()] })),
    skippedRows,
  };
}

/** The nutrition CSV among an export's files: MFP has named it differently over the years. */
export function pickNutritionFile(names: readonly string[]): string | null {
  const csvs = names.filter((name) => /\.csv$/i.test(name) && !name.startsWith('__MACOSX'));
  return (
    csvs.find((name) => /nutrition/i.test(name)) ??
    csvs.find((name) => /meal|repas|alimenta/i.test(name)) ??
    null
  );
}
