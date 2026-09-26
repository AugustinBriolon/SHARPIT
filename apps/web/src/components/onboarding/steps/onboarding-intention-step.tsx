'use client';

import { OnboardingStepShell } from '@/components/onboarding/steps/onboarding-step-shell';
import { GoalCreateForm } from '@/components/goals/dialogs/goal-create-form';
import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@sharpit/server/lib/practiced-sports';

export function OnboardingIntentionStep({
  error,
  practicedSports,
  onSkip,
  onSubmit,
}: {
  error: string | null;
  practicedSports: readonly PracticedSportId[];
  onSkip: () => void;
  onSubmit: (payload: GoalPayload) => Promise<void>;
}) {
  return (
    <OnboardingStepShell
      intro="Pose un premier objectif en quelques champs. Tu pourras le compléter (nom, lieu, notes…) dans Progression."
      title="Pourquoi SharpIt ?"
      titleId="onboarding-intention-title"
      docksOwnActions
    >
      <GoalCreateForm
        error={error}
        footerVariant="docked"
        practicedSports={practicedSports}
        skipLabel="Passer"
        submitLabel="Continuer"
        compact
        onSkip={onSkip}
        onSubmit={onSubmit}
      />
    </OnboardingStepShell>
  );
}
