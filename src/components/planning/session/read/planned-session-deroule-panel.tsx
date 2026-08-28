'use client';

import { Button } from '@/components/ui/button';
import { ExerciseMediaAttribution } from '@/components/sessions/exercise-visual';
import { EnduranceStepList } from '@/components/planning/session/read/endurance-step-list';
import { StrengthSetListItem } from '@/components/planning/session/read/strength-set-list-item';
import { dayLabelFromDayKey } from '@/lib/date/day-key';
import type { StrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';
import type { useEndurancePreview } from '@/hooks/use-endurance-preview';
import type { useGarminWorkoutPush } from '@/hooks/use-garmin-workout-push';
import type { useGarminPushStaleness } from '@/hooks/use-garmin-push-staleness';
import { Watch } from 'lucide-react';

function watchPushButtonLabel({
  pushing,
  alreadyOnWatch,
  stale,
}: {
  pushing: boolean;
  alreadyOnWatch: boolean;
  stale: boolean;
}): string {
  if (pushing) {
    return alreadyOnWatch ? 'Renvoi…' : 'Envoi…';
  }
  if (stale) {
    return 'Mettre à jour';
  }
  return alreadyOnWatch ? 'Renvoyer' : 'Envoyer à la montre';
}

function watchPushButtonLabelShort({
  pushing,
  alreadyOnWatch,
  stale,
}: {
  pushing: boolean;
  alreadyOnWatch: boolean;
  stale: boolean;
}): string {
  if (pushing) {
    return 'Envoi…';
  }
  if (stale) {
    return 'Màj';
  }
  return alreadyOnWatch ? 'Renvoyer' : 'Montre';
}

function WatchPushButton({
  canPush,
  garminPush,
  watchStaleness,
}: {
  canPush: boolean;
  garminPush: ReturnType<typeof useGarminWorkoutPush>;
  watchStaleness: ReturnType<typeof useGarminPushStaleness>;
}) {
  const { pushing, alreadyOnWatch, sendToWatch } = garminPush;
  const labelArgs = { pushing, alreadyOnWatch, stale: watchStaleness.stale };

  return (
    <Button
      className="h-8 shrink-0 gap-1 px-2.5 text-xs lg:h-7"
      disabled={pushing}
      size="xs"
      type="button"
      variant="outline"
      onClick={() => void sendToWatch({ canPush })}
    >
      <Watch className="size-3.5" />
      <span className="hidden sm:inline">{watchPushButtonLabel(labelArgs)}</span>
      <span className="sm:hidden">{watchPushButtonLabelShort(labelArgs)}</span>
    </Button>
  );
}

function WatchStatusLine({
  watchPush,
}: {
  watchPush: ReturnType<typeof useGarminWorkoutPush>['watchPush'];
}) {
  if (!watchPush.workoutId) {
    return null;
  }

  const scheduled = watchPush.scheduledDate
    ? ` · ${dayLabelFromDayKey(watchPush.scheduledDate)}`
    : '';
  const pushed = watchPush.pushedAt
    ? ` · envoyé ${new Date(watchPush.pushedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : '';

  return (
    <p className="text-muted-foreground text-xs leading-snug">
      Sur Garmin{scheduled}
      {pushed}
    </p>
  );
}

function DerouleWatchActions({
  isRealized,
  hasStrengthPlan,
  hasEndurancePlan,
  prescription,
  garminPush,
  watchStaleness,
}: {
  isRealized: boolean;
  hasStrengthPlan: boolean;
  hasEndurancePlan: boolean;
  prescription: StrengthPrescription | null;
  garminPush: ReturnType<typeof useGarminWorkoutPush>;
  watchStaleness: ReturnType<typeof useGarminPushStaleness>;
}) {
  const pushButtons =
    !isRealized && (hasStrengthPlan || hasEndurancePlan)
      ? [
          hasStrengthPlan ? (
            <WatchPushButton
              key="strength"
              canPush={Boolean(prescription)}
              garminPush={garminPush}
              watchStaleness={watchStaleness}
            />
          ) : null,
          hasEndurancePlan ? (
            <WatchPushButton
              key="endurance"
              canPush={true}
              garminPush={garminPush}
              watchStaleness={watchStaleness}
            />
          ) : null,
        ].filter(Boolean)
      : [];

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-foreground/85 text-sm font-medium">Déroulé</p>
      {pushButtons.length > 0 ? <div className="flex gap-2">{pushButtons}</div> : null}
    </div>
  );
}

function DerouleWatchChrome({
  isRealized,
  hasStrengthPlan,
  hasEndurancePlan,
  prescription,
  garminPush,
  watchStaleness,
}: {
  isRealized: boolean;
  hasStrengthPlan: boolean;
  hasEndurancePlan: boolean;
  prescription: StrengthPrescription | null;
  garminPush: ReturnType<typeof useGarminWorkoutPush>;
  watchStaleness: ReturnType<typeof useGarminPushStaleness>;
}) {
  const { alreadyOnWatch, watchPush } = garminPush;

  return (
    <>
      <DerouleWatchActions
        garminPush={garminPush}
        hasEndurancePlan={hasEndurancePlan}
        hasStrengthPlan={hasStrengthPlan}
        isRealized={isRealized}
        prescription={prescription}
        watchStaleness={watchStaleness}
      />
      {alreadyOnWatch ? <WatchStatusLine watchPush={watchPush} /> : null}
      {alreadyOnWatch && watchStaleness.reason ? (
        <p className="text-primary text-xs leading-snug">{watchStaleness.reason}</p>
      ) : null}
    </>
  );
}

function StrengthDerouleContent({
  hasStrengthPlan,
  strengthIntent,
  orderedSets,
}: {
  hasStrengthPlan: boolean;
  strengthIntent: string | null;
  orderedSets: StrengthPrescription['sets'];
}) {
  if (!hasStrengthPlan) {
    return null;
  }

  return (
    <>
      {strengthIntent ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{strengthIntent}</p>
      ) : null}
      <ul className="space-y-1.5">
        {orderedSets.map((set, i) => (
          <StrengthSetListItem key={`${set.order}-${set.exercise}`} index={i} set={set} />
        ))}
      </ul>
    </>
  );
}

function EnduranceDerouleContent({
  hasEndurancePlan,
  endurancePreview,
}: {
  hasEndurancePlan: boolean;
  endurancePreview: ReturnType<typeof useEndurancePreview>;
}) {
  if (!hasEndurancePlan) {
    return null;
  }

  return (
    <div className="space-y-2">
      <EnduranceStepList steps={endurancePreview.steps} />
      {endurancePreview.derived ? (
        <p className="text-muted-foreground/80 text-xs leading-snug">
          Sans étapes détaillées — un bloc unique dérivé de la durée et de l&apos;intensité.
        </p>
      ) : null}
      {endurancePreview.warnings.length > 0 ? (
        <p className="text-muted-foreground/80 text-xs leading-snug">
          {endurancePreview.warnings[0]}
        </p>
      ) : null}
    </div>
  );
}

function FreeTextDerouleContent({
  hasStructuredDeroule,
  freeTextDeroule,
}: {
  hasStructuredDeroule: boolean;
  freeTextDeroule: string | null;
}) {
  if (hasStructuredDeroule) {
    return null;
  }
  if (freeTextDeroule) {
    return (
      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {freeTextDeroule}
      </p>
    );
  }
  return <p className="text-muted-foreground/70 text-sm italic">Aucun déroulé renseigné.</p>;
}

export function PlannedSessionDeroulePanel({
  garminPush,
  watchStaleness,
  isRealized,
  hasStrengthPlan,
  hasEndurancePlan,
  hasStructuredDeroule,
  freeTextDeroule,
  strengthIntent,
  prescription,
  orderedSets,
  hasExerciseMedia,
  endurancePreview,
}: {
  garminPush: ReturnType<typeof useGarminWorkoutPush>;
  watchStaleness: ReturnType<typeof useGarminPushStaleness>;
  isRealized: boolean;
  hasStrengthPlan: boolean;
  hasEndurancePlan: boolean;
  hasStructuredDeroule: boolean;
  freeTextDeroule: string | null;
  strengthIntent: string | null;
  prescription: StrengthPrescription | null;
  orderedSets: StrengthPrescription['sets'];
  hasExerciseMedia: boolean;
  endurancePreview: ReturnType<typeof useEndurancePreview>;
}) {
  return (
    <div className="border-analysis-border/60 space-y-3 rounded-lg border p-3">
      <DerouleWatchChrome
        garminPush={garminPush}
        hasEndurancePlan={hasEndurancePlan}
        hasStrengthPlan={hasStrengthPlan}
        isRealized={isRealized}
        prescription={prescription}
        watchStaleness={watchStaleness}
      />
      <StrengthDerouleContent
        hasStrengthPlan={hasStrengthPlan}
        orderedSets={orderedSets}
        strengthIntent={strengthIntent}
      />
      <EnduranceDerouleContent
        endurancePreview={endurancePreview}
        hasEndurancePlan={hasEndurancePlan}
      />
      <FreeTextDerouleContent
        freeTextDeroule={freeTextDeroule}
        hasStructuredDeroule={hasStructuredDeroule}
      />
      {hasStrengthPlan && hasExerciseMedia ? (
        <ExerciseMediaAttribution>
          Les visuels sont indicatifs — respecte la consigne du coach en cas d’écart.
        </ExerciseMediaAttribution>
      ) : null}
    </div>
  );
}
