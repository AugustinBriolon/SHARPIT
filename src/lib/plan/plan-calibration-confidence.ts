/** One training block. After this, a stored threshold has usually moved. */
export const THRESHOLD_STALE_DAYS = 90;

export type CalibrationConfidenceKind = 'missing' | 'stale' | 'pending';

export type CalibrationConfidence = {
  kind: CalibrationConfidenceKind;
  message: string;
};

export type CalibrationConfidenceInput = {
  hasThreshold: boolean;
  syncedAt: string | null;
  hasPendingEstimate: boolean;
  now: Date;
};

const MESSAGES: Record<CalibrationConfidenceKind, string> = {
  missing: 'Les charges ci-dessus n’ont pas de règle graduée. Pose tes seuils pour les lire.',
  stale: 'Tes seuils datent de plus d’un bloc. La charge affichée peut se tromper d’échelle.',
  pending:
    'Une estimation de seuil attend d’être appliquée. La charge ci-dessus utilise encore l’ancienne règle.',
};

function daysSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * A quiet line at the foot of the hub, only when calibration degrades a reading.
 *
 * It never prints FTP, LTHR or pace: those values belong on `/moi/calibration`.
 * Pending estimates win over staleness, because the athlete already has a
 * decision waiting.
 */
export function resolveCalibrationConfidence(
  input: CalibrationConfidenceInput,
): CalibrationConfidence | null {
  if (input.hasPendingEstimate) {
    return { kind: 'pending', message: MESSAGES.pending };
  }
  if (!input.hasThreshold) {
    return { kind: 'missing', message: MESSAGES.missing };
  }
  if (input.syncedAt && daysSince(input.syncedAt, input.now) > THRESHOLD_STALE_DAYS) {
    return { kind: 'stale', message: MESSAGES.stale };
  }
  return null;
}
