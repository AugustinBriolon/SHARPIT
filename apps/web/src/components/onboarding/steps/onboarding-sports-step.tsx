'use client';

import { OnboardingContinueButton } from '@/components/onboarding/steps/onboarding-step-actions';
import { OnboardingStepShell } from '@/components/onboarding/steps/onboarding-step-shell';
import { PracticedSportsPicker } from '@/components/practiced-sports/practiced-sports-picker';
import { hasCorePracticedSport, type PracticedSportId } from '@sharpit/server/lib/practiced-sports';

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

          <OnboardingContinueButton disabled={!canContinue || busy} onClick={onContinue} />
        </>
      }
    >
      <PracticedSportsPicker sports={sports} compact onSportsChange={onSportsChange} />
    </OnboardingStepShell>
  );
}
