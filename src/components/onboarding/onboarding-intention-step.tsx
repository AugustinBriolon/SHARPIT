'use client';

import { GoalCreateForm } from '@/components/goals/dialogs/goal-create-form';
import { Button } from '@/components/ui/button';
import type { GoalPayload } from '@/hooks/use-data';
import type { PracticedSportId } from '@/lib/practiced-sports';

export function OnboardingIntentionStep({
  error,
  busy,
  practicedSports,
  onSkip,
  onSubmit,
  onBack,
}: {
  error: string | null;
  busy: boolean;
  practicedSports: readonly PracticedSportId[];
  onSkip: () => void;
  onSubmit: (payload: GoalPayload) => Promise<void>;
  onBack?: () => void;
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
        practicedSports={practicedSports}
        skipLabel="Je décide plus tard"
        submitLabel="Continuer"
        onSkip={onSkip}
        onSubmit={onSubmit}
      />

      {onBack ? (
        <div className="flex justify-start">
          <Button disabled={busy} type="button" variant="ghost" onClick={onBack}>
            Retour
          </Button>
        </div>
      ) : null}
    </section>
  );
}
