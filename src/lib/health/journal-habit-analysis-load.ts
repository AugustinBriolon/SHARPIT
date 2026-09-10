/**
 * Load joined journal × DailyHealth series for habit analysis.
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import { parseDayJournalEntry } from '@/lib/health/day-journal';
import {
  buildJournalHabitFindings,
  recordedFactorValue,
  type JournalAnalysisDay,
  type JournalHabitFinding,
  type RecordedFactor,
} from '@/lib/health/journal-habit-analysis';
import { dayHasJournalSignal } from '@/lib/health/journal-limits';
import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';

function trainingDayIdFromDate(date: Date): string {
  return toUtcDateOnly(date).toISOString().slice(0, 10);
}

function parseFactors(raw: unknown): Record<string, RecordedFactor | null> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const factors: Record<string, RecordedFactor | null> = {};
  for (const [id, state] of Object.entries(raw as Record<string, unknown>)) {
    const recorded = recordedFactorValue(typeof state === 'string' ? state : null);
    if (recorded !== null) {
      factors[id] = recorded;
    }
  }
  return factors;
}

const JOURNAL_ROW_SELECT = {
  trainingDayId: true,
  factors: true,
  moodLabel: true,
  hydrationMl: true,
  caffeineMg: true,
  updatedAt: true,
} as const;

const HEALTH_ROW_SELECT = {
  date: true,
  sleepMinutes: true,
  recoveryScore: true,
  bodyBattery: true,
} as const;

type JournalRow = Prisma.AthleteDayJournalGetPayload<{ select: typeof JOURNAL_ROW_SELECT }>;
type HealthRow = Prisma.DailyHealthGetPayload<{ select: typeof HEALTH_ROW_SELECT }>;

function indexHealthByDay(rows: readonly HealthRow[]): Map<string, HealthRow> {
  const healthByDay = new Map<string, HealthRow>();
  for (const row of rows) {
    healthByDay.set(trainingDayIdFromDate(row.date), row);
  }
  return healthByDay;
}

function healthOutcomes(
  health: HealthRow | undefined,
): Pick<JournalAnalysisDay, 'sleepMinutes' | 'recoveryScore' | 'bodyBattery'> {
  return {
    sleepMinutes: health?.sleepMinutes ?? null,
    recoveryScore: health?.recoveryScore ?? null,
    bodyBattery: health?.bodyBattery ?? null,
  };
}

/** Null when the day carries no explicit athlete signal. */
function toAnalysisDay(
  row: JournalRow,
  healthByDay: Map<string, HealthRow>,
): JournalAnalysisDay | null {
  const entry = parseDayJournalEntry(row.trainingDayId, {
    trainingDayId: row.trainingDayId,
    factors: row.factors,
    moodLabel: row.moodLabel,
    hydrationMl: row.hydrationMl,
    caffeineMg: row.caffeineMg,
    updatedAt: row.updatedAt.toISOString(),
  });
  if (!entry || !dayHasJournalSignal(entry)) {
    return null;
  }
  return {
    trainingDayId: row.trainingDayId,
    factors: parseFactors(entry.factors),
    ...healthOutcomes(healthByDay.get(row.trainingDayId)),
  };
}

export async function loadJournalAnalysisSeries(
  prisma: PrismaClient,
  athleteId: string,
): Promise<JournalAnalysisDay[]> {
  const [journals, healthRows] = await Promise.all([
    prisma.athleteDayJournal.findMany({ where: { athleteId }, select: JOURNAL_ROW_SELECT }),
    prisma.dailyHealth.findMany({ where: { athleteId }, select: HEALTH_ROW_SELECT }),
  ]);

  const healthByDay = indexHealthByDay(healthRows);
  const days: JournalAnalysisDay[] = [];
  for (const row of journals) {
    const day = toAnalysisDay(row, healthByDay);
    if (day) {
      days.push(day);
    }
  }

  return days.sort((a, b) => a.trainingDayId.localeCompare(b.trainingDayId));
}

export async function loadJournalHabitFindings(
  prisma: PrismaClient,
  athleteId: string,
): Promise<{ daysWithSignal: number; findings: JournalHabitFinding[] }> {
  const series = await loadJournalAnalysisSeries(prisma, athleteId);
  return {
    daysWithSignal: series.length,
    findings: buildJournalHabitFindings(series),
  };
}
