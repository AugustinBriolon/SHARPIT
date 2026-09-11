import type { RecordsPayload } from '@/lib/training/records';

/** Compact badge labels for PR categories (full labels are too long for a pill). */
const PR_BADGE_LABELS: Record<string, string> = {
  'run-distance': 'Record distance',
  'run-elevation': 'Record D+',
  'run-pace': 'Record allure',
  'run-duration': 'Record durée',
  'bike-np': 'Record NP',
  'bike-avg-power': 'Record puissance',
  'bike-elevation': 'Record D+',
  'bike-duration': 'Record durée',
  'swim-distance': 'Record distance',
  'swim-pace': 'Record allure',
  'swim-duration': 'Record durée',
};

function claimRunBests(
  labels: Map<string, string>,
  claim: (activityId: string | null, label: string) => void,
  runBests: RecordsPayload['runBests'],
): void {
  for (const category of runBests) {
    const best = category.entries.find((entry) => entry.rank === 1);
    if (best) {
      claim(best.activityId, `Record ${category.label}`);
    }
  }
}

function claimPowerCurve(
  labels: Map<string, string>,
  claim: (activityId: string | null, label: string) => void,
  powerCurve: RecordsPayload['powerCurve'],
): void {
  for (const point of powerCurve) {
    claim(point.activityId, `Record ${point.label}`);
  }
}

function claimSportPrs(
  labels: Map<string, string>,
  claim: (activityId: string | null, label: string) => void,
  prs: RecordsPayload['prs'],
): void {
  for (const categories of [prs.run, prs.bike, prs.swim]) {
    for (const category of categories) {
      const best = category.entries.find((entry) => entry.rank === 1);
      if (best) {
        claim(best.activityId, PR_BADGE_LABELS[category.key] ?? 'Record');
      }
    }
  }
}

/**
 * Map activityId → badge label for activities holding a current record
 * (rank 1). One badge per activity — distance references win over power
 * curve, which wins over generic PRs (most legible first).
 */
export function buildActivityRecordLabels(
  records: RecordsPayload | null | undefined,
): Map<string, string> {
  const labels = new Map<string, string>();
  if (!records) {
    return labels;
  }

  const claim = (activityId: string | null, label: string) => {
    if (activityId && !labels.has(activityId)) {
      labels.set(activityId, label);
    }
  };

  claimRunBests(labels, claim, records.runBests);
  claimPowerCurve(labels, claim, records.powerCurve);
  claimSportPrs(labels, claim, records.prs);

  return labels;
}
