'use client';

import { OnboardingStepShell } from '@/components/onboarding/onboarding-step-shell';
import { PracticedSportsPicker } from '@/components/practiced-sports/practiced-sports-picker';
import { Button } from '@/components/ui/button';
import { hasCorePracticedSport, type PracticedSportId } from '@/lib/practiced-sports';

export function OnboardingSportsStep({
  sports,
  busy,
  error,
  onSportsChange,
  onContinue,
}: {
  sports: readonly PracticedSportId[];
  busy: boolean;
  error: string | null;
  onSportsChange: (next: PracticedSportId[]) => void;
  onContinue: () => void;
}) {
  const canContinue = hasCorePracticedSport(sports);

  return (
    <OnboardingStepShell
      error={error}
      intro="SharpIt est pensé pour l'endurance. Dis-nous ce que tu fais vraiment — on adaptera les propositions."
      title="Quels sports tu pratiques ?"
      titleId="onboarding-sports-title"
      actions={
        <>
          <p className="text-muted-foreground text-xs sm:mr-auto" role="status">
            Choisis au moins un sport d&apos;endurance pour continuer.
          </p>

          <Button
            className="w-full sm:w-auto"
            disabled={!canContinue || busy}
            type="button"
            onClick={onContinue}
          >
            Continuer
          </Button>
        </>
      }
    >
      <PracticedSportsPicker sports={sports} compact onSportsChange={onSportsChange} />
    </OnboardingStepShell>
  );
}
