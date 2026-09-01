'use client';

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
    <section aria-labelledby="onboarding-sports-title" className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-section-title" id="onboarding-sports-title">
          Quels sports tu pratiques ?
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          SharpIt est pensé pour l&apos;endurance. Dis-nous ce que tu fais vraiment — on adaptera
          les propositions.
        </p>
      </div>

      <PracticedSportsPicker sports={sports} onSportsChange={onSportsChange} />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {!canContinue ? (
        <p className="text-muted-foreground text-xs" role="status">
          Choisis au moins un sport d&apos;endurance pour continuer.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button disabled={!canContinue || busy} type="button" onClick={onContinue}>
          Continuer
        </Button>
      </div>
    </section>
  );
}
