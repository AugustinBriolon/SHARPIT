import type { PrismaClient } from '@prisma/client';
import {
  emptyDayJournalEntry,
  type DayJournalEntry,
  type DayJournalFactorState,
} from '@/lib/health/day-journal';
import { isDayContextFactorId, type DayContextFactorId } from '@/lib/health/day-context-factors';

export type DayJournalWriteInput = {
  trainingDayId: string;
  factors?: DayJournalEntry['factors'];
  moodLabel?: string | null;
  hydrationMl?: number | null;
  caffeineMg?: number | null;
};

function parseFactors(raw: unknown): DayJournalEntry['factors'] {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const factors: DayJournalEntry['factors'] = {};
  for (const [key, state] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDayContextFactorId(key)) {
      continue;
    }
    if (state === 'unset' || state === 'no' || state === 'yes') {
      factors[key as DayContextFactorId] = state as DayJournalFactorState;
    }
  }
  return factors;
}

export function rowToDayJournalEntry(row: {
  trainingDayId: string;
  factors: unknown;
  moodLabel: string | null;
  hydrationMl: number | null;
  caffeineMg: number | null;
  updatedAt: Date;
}): DayJournalEntry {
  return {
    trainingDayId: row.trainingDayId,
    factors: parseFactors(row.factors),
    moodLabel: row.moodLabel,
    hydrationMl: row.hydrationMl,
    caffeineMg: row.caffeineMg,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getDayJournalEntry(
  prisma: PrismaClient,
  athleteId: string,
  trainingDayId: string,
): Promise<DayJournalEntry> {
  const row = await prisma.athleteDayJournal.findUnique({
    where: { athleteId_trainingDayId: { athleteId, trainingDayId } },
  });
  if (!row) {
    return emptyDayJournalEntry(trainingDayId);
  }
  return rowToDayJournalEntry(row);
}

type ExistingDayJournalRow = {
  factors: unknown;
  moodLabel: string | null;
  hydrationMl: number | null;
  caffeineMg: number | null;
} | null;

function resolveOptionalField<T>(
  inputValue: T | undefined,
  existingValue: T | null | undefined,
): T | null {
  if (inputValue !== undefined) {
    return inputValue;
  }
  return existingValue ?? null;
}

function mergeDayJournalWrite(
  existing: ExistingDayJournalRow,
  input: DayJournalWriteInput,
): {
  factors: DayJournalEntry['factors'];
  moodLabel: string | null;
  hydrationMl: number | null;
  caffeineMg: number | null;
} {
  return {
    factors: input.factors ?? parseFactors(existing?.factors) ?? {},
    moodLabel: resolveOptionalField(input.moodLabel, existing?.moodLabel),
    hydrationMl: resolveOptionalField(input.hydrationMl, existing?.hydrationMl),
    caffeineMg: resolveOptionalField(input.caffeineMg, existing?.caffeineMg),
  };
}

export async function upsertDayJournalEntryDb(
  prisma: PrismaClient,
  athleteId: string,
  input: DayJournalWriteInput,
): Promise<DayJournalEntry> {
  const existing = await prisma.athleteDayJournal.findUnique({
    where: {
      athleteId_trainingDayId: { athleteId, trainingDayId: input.trainingDayId },
    },
  });

  const { factors, moodLabel, hydrationMl, caffeineMg } = mergeDayJournalWrite(existing, input);

  const row = await prisma.athleteDayJournal.upsert({
    where: {
      athleteId_trainingDayId: { athleteId, trainingDayId: input.trainingDayId },
    },
    create: {
      athleteId,
      trainingDayId: input.trainingDayId,
      factors,
      moodLabel,
      hydrationMl,
      caffeineMg,
    },
    update: {
      factors,
      moodLabel,
      hydrationMl,
      caffeineMg,
    },
  });

  return rowToDayJournalEntry(row);
}
