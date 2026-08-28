import { prisma } from '@/lib/prisma';
import { createThresholdSnapshot, getAthleteProfile, upsertAthleteProfile } from '@/lib/queries';
import { getStoredRecords } from '@/lib/training/records';
import { SWIM_CSS_MIN_DISTANCE_M, type SwimCssSample } from '@/lib/threshold/swim-css';
import {
  computeThresholdEstimates,
  previewThresholdApply,
  resolveAcceptedFields,
  type ThresholdField,
} from './threshold-estimates';

/**
 * Realised pool sessions long enough for their average pace to mean something.
 *
 * `SwimMetrics.cssSecPer100m` exists but no sync path writes it — it is a
 * manual-entry field, empty in practice — so the estimate reads the average pace
 * Garmin does record (ADR-021).
 */
async function loadSwimCssSamples(athleteId: string): Promise<SwimCssSample[]> {
  const rows = await prisma.swimMetrics.findMany({
    where: {
      avgPaceSecPer100m: { gt: 0 },
      distanceM: { gte: SWIM_CSS_MIN_DISTANCE_M },
      activity: { athleteId },
    },
    select: {
      avgPaceSecPer100m: true,
      distanceM: true,
      activity: { select: { date: true } },
    },
  });

  return rows.flatMap((row) =>
    (row.avgPaceSecPer100m !== undefined && row.avgPaceSecPer100m !== null) && (row.distanceM !== undefined && row.distanceM !== null)
      ? [
          {
            paceSecPer100m: row.avgPaceSecPer100m,
            distanceM: row.distanceM,
            date: row.activity.date.toISOString(),
          },
        ]
      : [],
  );
}

async function loadPreviewInputs(athleteId: string) {
  const [records, profile, swimSamples] = await Promise.all([
    getStoredRecords(athleteId),
    getAthleteProfile(athleteId),
    loadSwimCssSamples(athleteId),
  ]);
  return { records, profile, swimSamples };
}

export async function getThresholdApplyPreview(athleteId: string) {
  const { records, profile, swimSamples } = await loadPreviewInputs(athleteId);
  return previewThresholdApply(records, profile, { swimSamples });
}

/**
 * Apply the estimates the athlete accepted.
 *
 * `fields` omitted means every proposed change, which is the historical
 * behaviour. Passing a subset lets the athlete take one sport's revision without
 * the others — a swim reference can be worth accepting on a day the running one
 * is not.
 */
function hasAnyThresholdEstimate(
  estimates: Awaited<ReturnType<typeof previewThresholdApply>>['estimates'],
) {
  return Boolean(
    estimates.ftpW || estimates.runThresholdPaceSecPerKm || estimates.swimCssSecPer100m,
  );
}

function buildThresholdUpdate(fields: {
  ftpW: number | null;
  runThresholdPaceSecPerKm: number | null;
  swimCssSecPer100m: number | null;
}) {
  const update: {
    ftpW?: number;
    runThresholdPaceSecPerKm?: number;
    swimCssSecPer100m?: number;
  } = {};
  if ((fields.ftpW !== undefined && fields.ftpW !== null)) {
    update.ftpW = fields.ftpW;
  }
  if ((fields.runThresholdPaceSecPerKm !== undefined && fields.runThresholdPaceSecPerKm !== null)) {
    update.runThresholdPaceSecPerKm = fields.runThresholdPaceSecPerKm;
  }
  if ((fields.swimCssSecPer100m !== undefined && fields.swimCssSecPer100m !== null)) {
    update.swimCssSecPer100m = fields.swimCssSecPer100m;
  }
  return update;
}

export async function applyEstimatedThresholds(
  athleteId: string,
  options?: { fields?: ThresholdField[] },
) {
  const { records, profile, swimSamples } = await loadPreviewInputs(athleteId);
  const preview = previewThresholdApply(records, profile, { swimSamples });
  const { estimates } = preview;

  if (!hasAnyThresholdEstimate(estimates)) {
    return { applied: false as const, reason: 'no_estimates' as const, preview };
  }

  if (!preview.hasChanges) {
    return { applied: false as const, reason: 'unchanged' as const, preview };
  }

  const accepted = new Set(
    resolveAcceptedFields(
      preview.changes.map((change) => change.field),
      options?.fields,
    ),
  );

  if (accepted.size === 0) {
    return { applied: false as const, reason: 'nothing_selected' as const, preview };
  }

  const pick = <T>(field: ThresholdField, value: T | null): T | null =>
    accepted.has(field) ? value : null;

  const picked = {
    ftpW: pick('ftpW', estimates.ftpW),
    runThresholdPaceSecPerKm: pick('runThresholdPaceSecPerKm', estimates.runThresholdPaceSecPerKm),
    swimCssSecPer100m: pick('swimCssSecPer100m', estimates.swimCssSecPer100m),
  };

  const updated = await upsertAthleteProfile(athleteId, buildThresholdUpdate(picked));
  await createThresholdSnapshot(athleteId, {
    source: 'estimated',
    ...picked,
  });

  return { applied: true as const, profile: updated, preview, appliedFields: [...accepted] };
}

export { computeThresholdEstimates };
