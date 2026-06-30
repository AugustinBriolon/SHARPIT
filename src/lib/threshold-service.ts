import { createThresholdSnapshot, getAthleteProfile, upsertAthleteProfile } from '@/lib/queries';
import { getStoredRecords } from '@/lib/records';
import { computeThresholdEstimates, previewThresholdApply } from '@/lib/threshold-estimates';

export async function getThresholdApplyPreview() {
  const [records, profile] = await Promise.all([getStoredRecords(), getAthleteProfile()]);
  return previewThresholdApply(records, profile);
}

export async function applyEstimatedThresholds() {
  const [records, profile] = await Promise.all([getStoredRecords(), getAthleteProfile()]);
  const preview = previewThresholdApply(records, profile);
  const { estimates } = preview;

  if (!estimates.ftpW && !estimates.runThresholdPaceSecPerKm) {
    return { applied: false as const, reason: 'no_estimates' as const, preview };
  }

  if (!preview.hasChanges) {
    return { applied: false as const, reason: 'unchanged' as const, preview };
  }

  const update: {
    ftpW?: number;
    runThresholdPaceSecPerKm?: number;
  } = {};
  if (estimates.ftpW != null) update.ftpW = estimates.ftpW;
  if (estimates.runThresholdPaceSecPerKm != null) {
    update.runThresholdPaceSecPerKm = estimates.runThresholdPaceSecPerKm;
  }

  const updated = await upsertAthleteProfile(update);
  await createThresholdSnapshot({
    source: 'estimated',
    ftpW: estimates.ftpW,
    runThresholdPaceSecPerKm: estimates.runThresholdPaceSecPerKm,
  });

  return { applied: true as const, profile: updated, preview };
}

export { computeThresholdEstimates };
