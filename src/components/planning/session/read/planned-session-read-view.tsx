'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { SessionRationaleCard } from '@/components/coach/plan/session-rationale-card';
import {
  PlannedSessionContextPanel,
  PlannedSessionContextPanelSkeleton,
} from '../edit/planned-session-context-panel';
import { MorningProposalCompare } from '../edit/morning-proposal-compare';
import { SessionAccessoriesSection } from '../accessories/session-accessories-section';
import { SessionRealization } from '../realize/session-realization';
import {
  ExerciseIndex,
  ExerciseMediaAttribution,
  ExerciseMediaCaption,
  ExerciseVisual,
} from '@/components/sessions/exercise-visual';
import { Button } from '@/components/ui/button';
import { resolveStrengthSetMedia } from '@/lib/exercises';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { useSessionRationalePresentation } from '@/hooks/use-data';
import { useGarminPushStaleness } from '@/hooks/use-garmin-push-staleness';
import { useEndurancePreview } from '@/hooks/use-endurance-preview';
import { useGarminWorkoutPush } from '@/hooks/use-garmin-workout-push';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { formatPlannedSessionLocationDisplay } from '@/lib/planned-session/display/planned-session-display';
import {
  attachGarminRefsToPrescription,
  extractStrengthSessionIntent,
  parseStrengthPrescription,
  strengthSetWatchCompat,
} from '@/lib/planned-session/strength/strength-prescription';
import { sportIdentityHex } from '@/lib/activity/sport-identity';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { exposureLabels, intensityLabels } from '@/lib/planned-session/sessions';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import { Brain, ClipboardList, MapPin, Pencil, Watch } from 'lucide-react';
import { EnduranceStepList } from '@/components/planning/session/read/endurance-step-list';
import { dayLabelFromDayKey } from '@/lib/date/day-key';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { cn } from '@/lib/utils';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { ActivityType } from '@prisma/client';

type KeyChip = { label: string; value: string; valueClassName?: string };

function KeyChipsRow({ chips }: { chips: KeyChip[] }) {
  return (
    <div
      className={cn('grid gap-2', chips.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}
    >
      {chips.map((chip) => (
        <div key={chip.label} className="chip-surface rounded-analysis px-3 py-2.5">
          <p className="text-label truncate">{chip.label}</p>
          <p className={cn('text-data mt-0.5 text-sm font-semibold', chip.valueClassName)}>
            {chip.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Compact planned → done facts for realized sessions. */
function PlannedVsDoneStrip({ session }: { session: ClientPlannedSession }) {
  const { mode } = useDisplayMode();
  const { activity } = session;
  if (!activity) return null;

  const plannedDuration = session.durationMin != null ? `${session.durationMin} min` : '—';
  const doneDuration = activity.duration != null ? formatDuration(activity.duration) : '—';
  const plannedLoad = session.load != null ? formatTrainingLoad(session.load, mode) : '—';
  const doneLoad = activity.load != null ? formatTrainingLoad(activity.load, mode) : '—';
  const plannedIntensity = session.intensity ? intensityLabels[session.intensity] : '—';
  let doneFeeling = '—';
  if (activity.rpe != null) doneFeeling = `RPE ${activity.rpe}`;
  else if (activity.feeling?.trim()) doneFeeling = activity.feeling;

  const rows = [
    { label: 'Durée', planned: plannedDuration, done: doneDuration },
    { label: 'Charge', planned: plannedLoad, done: doneLoad },
    { label: 'Effort', planned: plannedIntensity, done: doneFeeling },
  ];

  return (
    <div className="border-analysis-border/60 overflow-hidden rounded-lg border">
      <div className="bg-muted/30 text-label grid grid-cols-[4.5rem_1fr_1fr] gap-2 border-b px-3 py-1.5">
        <span className="sr-only">Élément</span>
        <span className="col-start-2">Plan</span>
        <span>Fait</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="border-analysis-border/40 grid grid-cols-[4.5rem_1fr_1fr] gap-2 border-b px-3 py-2 last:border-b-0"
        >
          <span className="text-muted-foreground text-xs font-medium">{row.label}</span>
          <span className="text-data text-muted-foreground text-sm tabular-nums">
            {row.planned}
          </span>
          <span className="text-data text-foreground text-sm font-medium tabular-nums">
            {row.done}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Glanceable read layout for the planned-session modal.
 * Realized sessions lead with the unified coach story; plan details fold below.
 */
export function PlannedSessionReadView({
  session,
  goals,
  context,
  contextPending = false,
  onEdit,
  omitLinkedActivityNavigation = false,
  morningProposal,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending?: boolean;
  onEdit: () => void;
  omitLinkedActivityNavigation?: boolean;
  morningProposal?: MorningProposalCompareInput;
}) {
  const { mode } = useDisplayMode();
  const { pushing, watchPush, alreadyOnWatch, sendToWatch } = useGarminWorkoutPush(session);
  const watchStaleness = useGarminPushStaleness({
    type: session.type,
    durationMin: session.durationMin,
    intensity: session.intensity,
    endurancePrescription: session.endurancePrescription,
    garminWorkoutThresholds: session.garminWorkoutThresholds,
    garminWorkoutId: watchPush.workoutId,
  });
  // Linked = activityId (or nested activity). omitLinkedActivityNavigation only hides nav.
  const isRealized = Boolean(session.activityId ?? session.activity);
  const goal = goals.find((g) => g.id === session.goalId);
  const showExposure = sportSupportsOutdoorContext(session.type);
  const exposure = session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined;

  const dateLabel =
    formatDate(new Date(session.date)) + (session.startTime ? ` · ${session.startTime}` : '');

  const locationValue =
    showExposure && exposure
      ? formatPlannedSessionLocationDisplay(
          session.locationLabel ?? context?.locationLabel,
          exposureLabels[exposure],
        )
      : null;

  const showContextPanel = Boolean(context?.visible);
  const showContextSkeleton = contextPending && showExposure && !showContextPanel;
  const contextSummary = context?.conditionsHeadline ?? locationValue ?? goal?.title ?? null;

  const rationaleQuery = useSessionRationalePresentation(session.id);
  const rationaleVm = rationaleQuery.data;
  const hasRationale =
    rationaleQuery.isPending ||
    (rationaleVm != null &&
      rationaleVm.origin !== 'MANUAL' &&
      (Boolean(rationaleVm.suggested) || Boolean(rationaleVm.outcome)));
  const rationaleOpenByDefault =
    !isRealized &&
    (rationaleVm?.suggested ? rationaleVm.suggested.gate.status !== 'ACCEPTED' : true);

  const chips: KeyChip[] = [
    { label: 'Durée', value: session.durationMin ? `${session.durationMin} min` : '—' },
    {
      label: 'Charge',
      value: session.load ? formatTrainingLoad(session.load, mode) : '—',
      valueClassName: 'text-primary',
    },
    { label: 'Intensité', value: session.intensity ? intensityLabels[session.intensity] : '—' },
  ];
  if (goal?.title) {
    chips.push({ label: 'Objectif', value: goal.title });
  }

  const prescriptionRaw = parseStrengthPrescription(session.strengthPrescription);
  const prescription = prescriptionRaw ? attachGarminRefsToPrescription(prescriptionRaw) : null;
  const orderedSets = prescription
    ? prescription.sets.slice().sort((a, b) => a.order - b.order)
    : [];
  const hasExerciseMedia = orderedSets.some((set) => resolveStrengthSetMedia(set) != null);
  const strengthIntent =
    session.type === ActivityType.STRENGTH && prescription
      ? extractStrengthSessionIntent(session.description)
      : null;

  // Swimming ships without a target table: the watch gets the set structure but no
  // pace band, which is where most of the value is in a pool anyway.
  const isSwim = session.type === ActivityType.SWIM;
  const endurancePreview = useEndurancePreview(session);
  const pushableSport =
    session.type === ActivityType.RUN || session.type === ActivityType.BIKE || isSwim;

  /**
   * One athlete-facing surface across sports: structure IS the déroulé when it
   * exists (strength sets / endurance steps). Free-text only fills the gap for
   * sessions without a structured plan — never a second copy of the same list.
   */
  const hasStrengthPlan = session.type === ActivityType.STRENGTH && prescription != null;
  const hasEndurancePlan = pushableSport && !isRealized;
  const hasStructuredDeroule = hasStrengthPlan || hasEndurancePlan;
  const freeTextDeroule = hasStructuredDeroule ? null : session.description?.trim() || null;

  function watchPushButtonLabel(): string {
    if (pushing) return alreadyOnWatch ? 'Renvoi…' : 'Envoi…';
    if (watchStaleness.stale) return 'Mettre à jour';
    return alreadyOnWatch ? 'Renvoyer' : 'Envoyer à la montre';
  }

  function watchPushButtonLabelShort(): string {
    if (pushing) return 'Envoi…';
    if (watchStaleness.stale) return 'Màj';
    return alreadyOnWatch ? 'Renvoyer' : 'Montre';
  }

  // Facts only: the day it sits on and when it left. The sync-on-next-connect
  // sentence was a standing explanation that stopped informing after the first read.
  const watchStatusLine = alreadyOnWatch ? (
    <p className="text-muted-foreground text-xs leading-snug">
      Sur Garmin
      {watchPush.scheduledDate ? ` · ${dayLabelFromDayKey(watchPush.scheduledDate)}` : ''}
      {watchPush.pushedAt
        ? ` · envoyé ${new Date(watchPush.pushedAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : ''}
    </p>
  ) : null;

  const watchStaleLine =
    alreadyOnWatch && watchStaleness.reason ? (
      <p className="text-primary text-xs leading-snug">{watchStaleness.reason}</p>
    ) : null;

  const watchPushButton = (canPush: boolean) => (
    <Button
      className="h-8 shrink-0 gap-1 px-2.5 text-xs lg:h-7"
      disabled={pushing}
      size="xs"
      type="button"
      variant="outline"
      onClick={() => void sendToWatch({ canPush })}
    >
      <Watch className="size-3.5" />
      <span className="hidden sm:inline">{watchPushButtonLabel()}</span>
      <span className="sm:hidden">{watchPushButtonLabelShort()}</span>
    </Button>
  );

  const strengthDerouleContent = hasStrengthPlan ? (
    <ul className="space-y-1.5">
      {orderedSets.map((set, i) => {
        const volume =
          set.durationSec && set.durationSec > 0 && set.reps <= 0
            ? `${set.sets}×${set.durationSec}s`
            : `${set.sets}×${set.reps}`;
        const weight = set.weightKg != null && set.weightKg > 0 ? ` @ ${set.weightKg} kg` : '';
        const restLabel =
          set.restMode === 'time' && set.restSec != null && set.restSec > 0
            ? `Repos ${set.restSec}s`
            : 'Repos Lap';
        const watch = strengthSetWatchCompat(set);
        const media = resolveStrengthSetMedia(set);
        return (
          <li key={`${set.order}-${set.exercise}`} className="flex items-start gap-3 text-sm">
            {media ? (
              <ExerciseVisual label={set.exercise} media={media} />
            ) : (
              <ExerciseIndex className="text-muted-foreground" index={i + 1} />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="text-muted-foreground flex items-baseline justify-between gap-2">
                <span className="text-foreground min-w-0 font-medium wrap-break-word">
                  {set.exercise}
                </span>
                <span className="text-data shrink-0 font-mono text-xs tabular-nums">
                  {volume}
                  {weight}
                </span>
              </div>
              {media ? <ExerciseMediaCaption media={media} /> : null}
              <p className="text-muted-foreground text-xs leading-snug">{restLabel}</p>
              <p
                className={cn(
                  'text-xs leading-snug',
                  watch.status === 'unknown' && 'text-muted-foreground',
                  watch.status === 'approx' && 'text-amber-700 dark:text-amber-400',
                  watch.status === 'ready' && 'text-muted-foreground',
                )}
              >
                {watch.label}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  ) : null;

  const enduranceDerouleContent = hasEndurancePlan ? (
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
  ) : null;

  const deroulePanel = !morningProposal ? (
    <div className="border-analysis-border/60 space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground/85 text-sm font-medium">Déroulé</p>
        {!isRealized && hasStrengthPlan ? watchPushButton(Boolean(prescription)) : null}
        {!isRealized && hasEndurancePlan ? watchPushButton(true) : null}
      </div>

      {strengthIntent ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{strengthIntent}</p>
      ) : null}

      {watchStatusLine}
      {watchStaleLine}

      {strengthDerouleContent}
      {enduranceDerouleContent}

      {!hasStructuredDeroule && freeTextDeroule ? (
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
          {freeTextDeroule}
        </p>
      ) : null}

      {!hasStructuredDeroule && !freeTextDeroule ? (
        <p className="text-muted-foreground/70 text-sm italic">Aucun déroulé renseigné.</p>
      ) : null}

      {hasStrengthPlan && hasExerciseMedia ? (
        <ExerciseMediaAttribution>
          Les visuels sont indicatifs — respecte la consigne du coach en cas d’écart.
        </ExerciseMediaAttribution>
      ) : null}
    </div>
  ) : null;

  const header = (
    <header className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-label inline-flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: sportIdentityHex(session.type) }}
            aria-hidden
          />
          <span className="truncate">
            {activityTypeLabels[session.type]} ·{' '}
            {isRealized ? 'Séance réalisée' : 'Séance programmée'}
          </span>
        </span>
        <Button
          aria-label="Modifier la séance"
          className="shrink-0"
          size="icon-xs"
          type="button"
          variant="outline"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
      <h2 className="text-card-title leading-snug">
        {session.title?.trim() || activityTypeLabels[session.type]}
      </h2>
      <p className="text-data text-muted-foreground text-xs">{dateLabel}</p>
    </header>
  );

  const secondaryDetails = (
    <div>
      {hasRationale ? (
        <CollapsibleSection
          defaultOpen={rationaleOpenByDefault}
          icon={Brain}
          label="Pourquoi cette séance"
        >
          <SessionRationaleCard sessionId={session.id} />
        </CollapsibleSection>
      ) : null}

      {showContextPanel || showContextSkeleton ? (
        <CollapsibleSection
          defaultOpen={false}
          icon={MapPin}
          label="Lieu & météo"
          summary={contextSummary}
        >
          {showContextPanel && context ? (
            <PlannedSessionContextPanel
              className="border-0 shadow-none"
              sessionId={session.id}
              viewModel={context}
              onChangeLocation={onEdit}
            />
          ) : (
            <PlannedSessionContextPanelSkeleton className="border-0 shadow-none" />
          )}
        </CollapsibleSection>
      ) : null}
    </div>
  );

  // ── Realized: story first, plan details after ────────────────────────────
  if (isRealized) {
    return (
      <div className="min-w-0 space-y-4">
        {header}

        <SessionRealization
          omitLinkedActivityNavigation={omitLinkedActivityNavigation}
          session={session}
        />

        {morningProposal ? (
          <MorningProposalCompare proposal={morningProposal} />
        ) : (
          <PlannedVsDoneStrip session={session} />
        )}

        <div>
          <CollapsibleSection
            defaultOpen={false}
            icon={ClipboardList}
            label="Plan prescrit"
            summary={
              session.durationMin != null
                ? `${session.durationMin} min${session.intensity ? ` · ${intensityLabels[session.intensity]}` : ''}`
                : null
            }
          >
            <div className="space-y-3">
              {deroulePanel}
              <SessionAccessoriesSection
                accessories={session.accessories}
                description={session.description}
                strengthPrescription={session.strengthPrescription}
                title={session.title}
                type={session.type}
              />
            </div>
          </CollapsibleSection>
          {secondaryDetails}
        </div>
      </div>
    );
  }

  // ── Planned (not yet done) ───────────────────────────────────────────────
  // min-w-0: this is a grid item inside the dialog, and without it fixed-width
  // content refuses to shrink and the panel overflows the viewport on mobile.
  return (
    <div className="min-w-0 space-y-4">
      {header}

      {morningProposal ? (
        <MorningProposalCompare proposal={morningProposal} />
      ) : (
        <KeyChipsRow chips={chips} />
      )}

      {deroulePanel}

      <SessionAccessoriesSection
        accessories={session.accessories}
        description={session.description}
        strengthPrescription={session.strengthPrescription}
        title={session.title}
        type={session.type}
      />

      {secondaryDetails}

      <div className="border-analysis-border/60 space-y-2 border-t pt-3">
        <DiscussWithCoachButton
          className="w-full sm:w-auto"
          size="lg"
          target={{ kind: 'planned-session', sessionId: session.id }}
          variant="default"
        />
        <SessionRealization
          omitLinkedActivityNavigation={omitLinkedActivityNavigation}
          session={session}
        />
      </div>
    </div>
  );
}
