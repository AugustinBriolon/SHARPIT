'use client';

import { GoalCreateForm } from '@/components/goals/dialogs/goal-create-form';
import type { GoalPayload } from '@/hooks/use-data';

export function OnboardingIntentionStep({
  error,
  busy,
  onSkip,
  onSubmit,
}: {
  error: string | null;
  busy: boolean;
  onSkip: () => void;
  onSubmit: (payload: GoalPayload) => Promise<void>;
}) {
  return (
    <section aria-labelledby="onboarding-intention-title" className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-section-title" id="onboarding-intention-title">
          Pourquoi SharpIt ?
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Pose un premier objectif — les mêmes champs que dans Progression. Tu pourras en ajouter
          d’autres plus tard.
        </p>
      </div>

      <GoalCreateForm
        error={error}
        skipLabel="Je décide plus tard"
        submitLabel="Continuer"
        onSkip={onSkip}
        onSubmit={onSubmit}
      />
    </section>
  );
}
