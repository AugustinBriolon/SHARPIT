import type { StrengthRestMode } from '@/lib/planned-session/strength/strength-prescription';
import type { StrengthPrescriptionDraftRow } from '@/components/planning/session/edit/strength-prescription-editor';

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRestMode(row: StrengthPrescriptionDraftRow): StrengthRestMode {
  return row.restMode === 'time' ? 'time' : 'lap';
}

function restSecValue(
  row: StrengthPrescriptionDraftRow,
  restMode: StrengthRestMode,
): number | null {
  if (restMode !== 'time') {
    return null;
  }
  const restSecRaw = row.restSec.trim() ? Number(row.restSec) : null;
  if (restSecRaw === null || !Number.isFinite(restSecRaw)) {
    return null;
  }
  return Math.max(0, restSecRaw);
}

export function parseStrengthDraftRow(row: StrengthPrescriptionDraftRow, order: number) {
  const exercise = row.exercise.trim();
  if (!exercise) {
    return null;
  }
  const setsCount = Number(row.sets);
  const reps = Number(row.reps);
  if (!Number.isFinite(setsCount) || setsCount < 1) {
    return null;
  }
  const restMode = parseRestMode(row);
  return {
    exercise,
    exerciseCatalogId: null,
    sets: setsCount,
    reps: Number.isFinite(reps) ? Math.max(0, reps) : 0,
    durationSec: parseOptionalNumber(row.durationSec),
    weightKg: parseOptionalNumber(row.weightKg),
    restMode,
    restSec: restSecValue(row, restMode),
    notes: null,
    order,
  };
}
