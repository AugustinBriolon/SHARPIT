import { GoalHorizon, GoalKind, GoalPriority } from '@prisma/client';

export type OnboardingIntentionKind = 'race' | 'metric' | 'later';

export type OnboardingRaceDraft = {
  title: string;
  targetDate: string;
  location?: string;
};

export type OnboardingMetricDraft = {
  title: string;
  targetValue: number;
  unit: string;
  horizon?: GoalHorizon;
};

/** JSON body accepted by `POST /api/goals` from the onboarding intention step. */
export type OnboardingGoalPayload = {
  title: string;
  kind: GoalKind;
  horizon: GoalHorizon;
  priority?: GoalPriority | null;
  targetDate?: Date;
  location?: string | null;
  targetValue?: number | null;
  currentValue?: number | null;
  startValue?: number | null;
  unit?: string | null;
  lowerIsBetter?: boolean;
};

/** Builds a create-goal payload from the onboarding intention step. */
export function buildOnboardingGoalPayload(
  kind: Exclude<OnboardingIntentionKind, 'later'>,
  draft: OnboardingRaceDraft | OnboardingMetricDraft,
): OnboardingGoalPayload {
  if (kind === 'race') {
    const race = draft as OnboardingRaceDraft;
    return {
      title: race.title.trim(),
      kind: GoalKind.RACE,
      horizon: GoalHorizon.LONG_TERM,
      priority: GoalPriority.A,
      targetDate: new Date(race.targetDate),
      location: race.location?.trim() || null,
    };
  }

  const metric = draft as OnboardingMetricDraft;
  return {
    title: metric.title.trim(),
    kind: GoalKind.METRIC,
    horizon: metric.horizon ?? GoalHorizon.MEDIUM_TERM,
    targetValue: metric.targetValue,
    currentValue: null,
    startValue: null,
    unit: metric.unit.trim() || null,
    lowerIsBetter: false,
  };
}

export function isValidRaceDraft(draft: OnboardingRaceDraft): boolean {
  return draft.title.trim().length > 0 && Boolean(draft.targetDate);
}

export function isValidMetricDraft(draft: OnboardingMetricDraft): boolean {
  return (
    draft.title.trim().length > 0 &&
    Number.isFinite(draft.targetValue) &&
    draft.targetValue > 0 &&
    draft.unit.trim().length > 0
  );
}
