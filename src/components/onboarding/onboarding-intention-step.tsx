'use client';

import { OnboardingStepShell } from '@/components/onboarding/onboarding-step-shell';
import { GoalCreateForm } from '@/components/goals/dialogs/goal-create-form';
import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@/lib/practiced-sports';

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
    >
      <GoalCreateForm
        error={error}
        practicedSports={practicedSports}
        skipLabel="Je décide plus tard"
        submitLabel="Continuer"
        compact
        onSkip={onSkip}
        onSubmit={onSubmit}
      />
    </OnboardingStepShell>
  );
}
