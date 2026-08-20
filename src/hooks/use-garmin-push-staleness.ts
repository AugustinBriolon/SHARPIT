'use client';

import { useMemo } from 'react';
import type { SessionIntensity } from '@prisma/client';
import { useAthleteProfile } from '@/hooks/use-data';
import { enduranceSportFromActivityType } from '@/lib/planned-session/endurance/endurance-prescription';
import { effectiveEndurancePrescription } from '@/lib/planned-session/endurance/endurance-session';
import {
  garminPushStaleness,
  parsePushedThresholds,
  type GarminThresholdChange,
} from '@/lib/planned-session/endurance/endurance-staleness';
import type { AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';

const THRESHOLD_LABEL_FR: Record<keyof AthleteThresholds, string> = {
  runThresholdPaceSecPerKm: 'allure seuil',
  swimCssSecPer100m: 'vitesse critique',
  ftpW: 'FTP',
  lthr: 'FC seuil',
  maxHr: 'FC max',
};

export type GarminPushStalenessView = {
  /** True when a reference this session's targets depend on moved since the push. */
  stale: boolean;
  /** Athlete-facing reason, e.g. "allure seuil modifiée depuis l'envoi". */
  reason: string | null;
};

const FRESH: GarminPushStalenessView = { stale: false, reason: null };

function describe(changed: GarminThresholdChange[]): string {
  const labels = changed.map((change) => THRESHOLD_LABEL_FR[change.key]);
  const plural = labels.length > 1 ? 'modifiées' : 'modifiée';
  return `${labels.join(', ')} ${plural} depuis l'envoi — les cibles de la montre ne sont plus à jour.`;
}

/**
 * Does the workout already on the watch still match the athlete?
 *
 * Targets left as absolute numbers when they were pushed, so a threshold change
 * afterwards is invisible to the session itself. Derived sessions count too: they
 * carry no stored prescription but their targets come from the same references.
 */
export function useGarminPushStaleness(session: {
  type: string;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  endurancePrescription?: unknown;
  garminWorkoutThresholds?: unknown;
  garminWorkoutId: string | null;
}): GarminPushStalenessView {
  const { data: profile } = useAthleteProfile();

  return useMemo(() => {
    const sport = enduranceSportFromActivityType(session.type);
    if (!sport || !profile || !session.garminWorkoutId) return FRESH;

    const currentThresholds: AthleteThresholds = {
      runThresholdPaceSecPerKm: profile.runThresholdPaceSecPerKm,
      swimCssSecPer100m: profile.swimCssSecPer100m,
      ftpW: profile.ftpW,
      lthr: profile.lthr,
      maxHr: profile.maxHr,
    };

    const { prescription } = effectiveEndurancePrescription({
      sport,
      durationMin: session.durationMin,
      intensity: session.intensity,
      stored: session.endurancePrescription,
      thresholds: currentThresholds,
    });

    const { stale, changed } = garminPushStaleness({
      prescription,
      pushedThresholds: parsePushedThresholds(session.garminWorkoutThresholds),
      currentThresholds,
      hasPush: true,
    });

    return stale ? { stale, reason: describe(changed) } : FRESH;
  }, [
    profile,
    session.type,
    session.durationMin,
    session.intensity,
    session.endurancePrescription,
    session.garminWorkoutThresholds,
    session.garminWorkoutId,
  ]);
}
