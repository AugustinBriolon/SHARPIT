'use client';

import { useMemo } from 'react';
import type { SessionIntensity } from '@prisma/client';
import { useAthleteProfile } from '@/hooks/use-data';
import { enduranceSportFromActivityType } from '@/lib/planned-session/endurance/endurance-prescription';
import {
  previewEnduranceSteps,
  type EndurancePreviewStep,
} from '@/lib/planned-session/endurance/endurance-preview';
import { effectiveEndurancePrescription } from '@/lib/planned-session/endurance/endurance-session';
import type { AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';

export type EndurancePreview = {
  steps: EndurancePreviewStep[];
  /** True when the session has no structure and was derived from duration + intensity. */
  derived: boolean;
  /** Athlete-facing reasons a target could not be resolved. */
  warnings: string[];
};

const EMPTY: EndurancePreview = { steps: [], derived: false, warnings: [] };

/**
 * What this session will put on the watch, resolved against current thresholds.
 *
 * Same resolution the push performs, so the preview cannot promise a band the
 * push would not send — and a threshold change moves both at once.
 */
export function useEndurancePreview(session: {
  type: string;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  endurancePrescription?: unknown;
}): EndurancePreview {
  const { data: profile } = useAthleteProfile();

  return useMemo(() => {
    const sport = enduranceSportFromActivityType(session.type);
    if (!sport || !profile) {
      return EMPTY;
    }

    const thresholds: AthleteThresholds = {
      runThresholdPaceSecPerKm: profile.runThresholdPaceSecPerKm,
      swimCssSecPer100m: profile.swimCssSecPer100m,
      ftpW: profile.ftpW,
      lthr: profile.lthr,
      maxHr: profile.maxHr,
    };

    const { prescription, derived, warnings } = effectiveEndurancePrescription({
      sport,
      durationMin: session.durationMin,
      intensity: session.intensity,
      stored: session.endurancePrescription,
      thresholds,
      defaultPoolLengthM: profile.defaultPoolLengthM,
    });

    return { steps: previewEnduranceSteps(prescription, thresholds), derived, warnings };
  }, [
    profile,
    session.type,
    session.durationMin,
    session.intensity,
    session.endurancePrescription,
  ]);
}
