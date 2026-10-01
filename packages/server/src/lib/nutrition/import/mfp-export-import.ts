import { unzipSync, strFromU8 } from 'fflate';
import { prisma } from '@sharpit/db/client';
import {
  MfpExportFormatError,
  pickNutritionFile,
  readMfpNutritionCsv,
  type ImportedDay,
} from '@sharpit/app/lib/nutrition/import/mfp-export';
import { MFP_IMPORT_NUTRITION_PROVIDER } from '@sharpit/app/lib/nutrition/food-log/nutrition-source';
import { observationEngine } from '@sharpit/server/lib/engines/observation-engine';

/**
 * Imports the athlete's own MyFitnessPal export (ADR-062): the file they asked MFP for, not an
 * access to their account. Days land as `DailyNutrition` rows of their own provider, which every
 * reader already shows and which a day logged in SHARPIT or synced from MFP outranks.
 */

/** FUEL and the coach read recent weeks; older days stay on the page without a recompute. */
const OBSERVED_DAYS = 60;

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function isZip(bytes: Uint8Array): boolean {
  return ZIP_MAGIC.every((byte, index) => bytes[index] === byte);
}

/** The nutrition CSV's text, from the ZIP MFP emails or from the CSV taken out of it. */
export function exportText(bytes: Uint8Array): string {
  if (!isZip(bytes)) {
    return strFromU8(bytes);
  }
  const files = unzipSync(bytes, { filter: (file) => /\.csv$/i.test(file.name) });
  const name = pickNutritionFile(Object.keys(files));
  if (!name) {
    throw new MfpExportFormatError(
      'Cet export ne contient pas de fichier nutrition. Choisis la période avec tes repas notés.',
    );
  }
  return strFromU8(files[name]!);
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function dayTotals(day: ImportedDay) {
  const sum = (pick: (meal: ImportedDay['meals'][number]) => number | null) => {
    const values = day.meals.map(pick).filter((value): value is number => value !== null);
    return values.length ? round1(values.reduce((total, value) => total + value, 0)) : null;
  };
  return {
    calories: Math.round(sum((meal) => meal.calories) ?? 0),
    protein: sum((meal) => meal.protein) ?? 0,
    carbohydrates: sum((meal) => meal.carbs) ?? 0,
    fat: sum((meal) => meal.fat) ?? 0,
    fiber: sum((meal) => meal.fiber),
    sugar: sum((meal) => meal.sugar),
  };
}

function dayRow(athleteId: string, day: ImportedDay) {
  return {
    athleteId,
    date: new Date(`${day.date}T00:00:00.000Z`),
    provider: MFP_IMPORT_NUTRITION_PROVIDER,
    ...dayTotals(day),
    meals: day.meals.map((meal) => ({ ...meal, calories: Math.round(meal.calories) })),
    complete: true,
  };
}

/** Recent imported days no other source speaks for. */
async function daysToObserve(athleteId: string, days: ImportedDay[], now: Date) {
  const since = new Date(now.getTime() - OBSERVED_DAYS * 24 * 60 * 60 * 1000);
  const recent = days.filter((day) => new Date(`${day.date}T00:00:00Z`) >= since);
  const covered = await prisma.dailyNutrition.findMany({
    where: {
      athleteId,
      provider: { not: MFP_IMPORT_NUTRITION_PROVIDER },
      date: { in: recent.map((day) => new Date(`${day.date}T00:00:00.000Z`)) },
    },
    select: { date: true },
  });
  const coveredDays = new Set(covered.map((row) => row.date.toISOString().slice(0, 10)));
  return recent.filter((day) => !coveredDays.has(day.date));
}

async function observeDays(athleteId: string, days: ImportedDay[], now: Date) {
  for (const day of await daysToObserve(athleteId, days, now)) {
    const totals = dayTotals(day);
    await observationEngine
      .ingest(athleteId, {
        type: 'NUTRITION',
        source: 'MYFITNESSPAL',
        timestamp: new Date(`${day.date}T12:00:00Z`),
        receivedAt: now,
        energyKcal: totals.calories,
        proteinG: totals.protein,
        carbohydratesG: totals.carbohydrates,
        fatG: totals.fat,
        fiberG: totals.fiber ?? undefined,
        sugarG: totals.sugar ?? undefined,
        diaryComplete: true,
        entryCount: day.meals.length,
      })
      .catch((error) => console.error('[mfp-import] observation ingest failed:', error));
  }
}

export type MfpImportResult = {
  importedDays: number;
  firstDay: string | null;
  lastDay: string | null;
  skippedRows: number;
};

/** Replaces the previous import with this one, so importing twice never doubles a day. */
export async function importMfpExport(
  athleteId: string,
  bytes: Uint8Array,
  now = new Date(),
): Promise<MfpImportResult> {
  const { days, skippedRows } = readMfpNutritionCsv(exportText(bytes));
  if (days.length === 0) {
    throw new MfpExportFormatError('Aucun jour avec des calories dans ce fichier.');
  }
  await prisma.$transaction([
    prisma.dailyNutrition.deleteMany({
      where: { athleteId, provider: MFP_IMPORT_NUTRITION_PROVIDER },
    }),
    prisma.dailyNutrition.createMany({ data: days.map((day) => dayRow(athleteId, day)) }),
  ]);
  await observeDays(athleteId, days, now);
  return {
    importedDays: days.length,
    firstDay: days[0]!.date,
    lastDay: days.at(-1)!.date,
    skippedRows,
  };
}
