/**
 * Toast copy for a Garmin workout push, strength or endurance.
 * Pure so the wording stays testable outside the hook.
 */

export type GarminPushSummaryInput = {
  workoutName?: string;
  scheduledDate?: string | null;
  /** Strength: one entry per exercise. Endurance: one per step. */
  mapped?: Array<{ confidence?: string }>;
  skipped?: Array<unknown>;
  /** Endurance only — repeat groups expanded. */
  stepCount?: number;
  /** Endurance only — session had no structure, derived from duration + intensity. */
  derived?: boolean;
  /** Endurance only — targets that could not be resolved. */
  warnings?: string[];
};

function strengthParts(data: GarminPushSummaryInput): Array<string | null> {
  const mappedCount = data.mapped?.length ?? 0;
  const approximated = data.mapped?.filter((step) => step.confidence === 'fallback').length ?? 0;
  const skipped = data.skipped?.length ?? 0;
  return [
    mappedCount > 0 ? `${mappedCount} exercices` : null,
    approximated > 0 ? `${approximated} en nom générique` : null,
    skipped > 0 ? `${skipped} omis (hors catalogue)` : null,
  ];
}

function enduranceParts(data: GarminPushSummaryInput): Array<string | null> {
  const steps = data.stepCount ?? 0;
  return [
    steps > 0 ? `${steps} étape${steps > 1 ? 's' : ''}` : null,
    data.derived ? 'séance simple (durée + intensité)' : null,
    data.warnings?.length ? 'sans cible chiffrée' : null,
  ];
}

export function buildPushToastDescription(data: GarminPushSummaryInput): string {
  const sportParts = data.stepCount !== null ? enduranceParts(data) : strengthParts(data);
  return [
    data.workoutName,
    ...sportParts,
    data.scheduledDate ? `calendrier ${data.scheduledDate}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
