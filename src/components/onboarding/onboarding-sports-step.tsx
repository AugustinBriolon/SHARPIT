'use client';

import { PracticedSportsPicker } from '@/components/practiced-sports/practiced-sports-picker';
import { Button } from '@/components/ui/button';
import { hasCorePracticedSport, type PracticedSportId } from '@/lib/practiced-sports';

function SportsStepHeader() {
  return (
    <div className="space-y-1 text-center">
      <h1 className="text-section-title" id="onboarding-sports-title">
        Quels sports tu pratiques ?
      </h1>
      <p className="text-muted-foreground text-sm text-pretty">
        SharpIt est pensé pour l&apos;endurance. Dis-nous ce que tu fais vraiment — on adaptera les
        propositions.
      </p>
    </div>
  );
}

function SportsStepFooter({
  canContinue,
  busy,
  onContinue,
}: {
  canContinue: boolean;
  busy: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="bg-background border-border/60 sticky bottom-0 z-10 mt-3 flex shrink-0 flex-col gap-2 border-t pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
      <Button
        className="w-full sm:w-auto"
        disabled={!canContinue || busy}
        type="button"
        onClick={onContinue}
      >
        Continuer
      </Button>
    </div>
  );
}

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
    <section
      aria-labelledby="onboarding-sports-title"
      className="flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-10.5rem)] flex-col sm:h-[calc(100dvh-12rem)] sm:max-h-[calc(100dvh-12rem)]"
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
        <SportsStepHeader />
        <PracticedSportsPicker sports={sports} compact onSportsChange={onSportsChange} />
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
      </div>
      <SportsStepFooter busy={busy} canContinue={canContinue} onContinue={onContinue} />
    </section>
  );
}
