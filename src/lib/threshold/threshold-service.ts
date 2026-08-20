import { prisma } from '@/lib/prisma';
import { createThresholdSnapshot, getAthleteProfile, upsertAthleteProfile } from '@/lib/queries';
import { getStoredRecords } from '@/lib/training/records';
import { SWIM_CSS_MIN_DISTANCE_M, type SwimCssSample } from '@/lib/threshold/swim-css';
import { computeThresholdEstimates, previewThresholdApply } from './threshold-estimates';

/**
 * Realised pool sessions carrying a CSS. Garmin computes it per session, so the
 * estimate reads them directly rather than going through the records pipeline.
 */
async function loadSwimCssSamples(): Promise<SwimCssSample[]> {
  const rows = await prisma.swimMetrics.findMany({
    where: {
      cssSecPer100m: { gt: 0 },
      distanceM: { gte: SWIM_CSS_MIN_DISTANCE_M },
    },
    select: {
      cssSecPer100m: true,
      distanceM: true,
      activity: { select: { date: true } },
    },
  });

  return rows.flatMap((row) =>
    row.cssSecPer100m != null && row.distanceM != null
      ? [
          {
            cssSecPer100m: row.cssSecPer100m,
            distanceM: row.distanceM,
            date: row.activity.date.toISOString(),
          },
        ]
      : [],
  );
}

async function loadPreviewInputs() {
  const [records, profile, swimSamples] = await Promise.all([
    getStoredRecords(),
    getAthleteProfile(),
    loadSwimCssSamples(),
  ]);
  return { records, profile, swimSamples };
}

export async function getThresholdApplyPreview() {
  const { records, profile, swimSamples } = await loadPreviewInputs();
  return previewThresholdApply(records, profile, { swimSamples });
}

export async function applyEstimatedThresholds() {
  const { records, profile, swimSamples } = await loadPreviewInputs();
  const preview = previewThresholdApply(records, profile, { swimSamples });
  const { estimates } = preview;

  if (!estimates.ftpW && !estimates.runThresholdPaceSecPerKm && !estimates.swimCssSecPer100m) {
    return { applied: false as const, reason: 'no_estimates' as const, preview };
  }

  if (!preview.hasChanges) {
    return { applied: false as const, reason: 'unchanged' as const, preview };
  }

  const update: {
    ftpW?: number;
    runThresholdPaceSecPerKm?: number;
    swimCssSecPer100m?: number;
  } = {};
  if (estimates.ftpW != null) update.ftpW = estimates.ftpW;
  if (estimates.runThresholdPaceSecPerKm != null) {
    update.runThresholdPaceSecPerKm = estimates.runThresholdPaceSecPerKm;
  }
  if (estimates.swimCssSecPer100m != null) {
    update.swimCssSecPer100m = estimates.swimCssSecPer100m;
  }

  const updated = await upsertAthleteProfile(update);
  await createThresholdSnapshot({
    source: 'estimated',
    ftpW: estimates.ftpW,
    runThresholdPaceSecPerKm: estimates.runThresholdPaceSecPerKm,
    swimCssSecPer100m: estimates.swimCssSecPer100m,
  });

  return { applied: true as const, profile: updated, preview };
}

export { computeThresholdEstimates };
