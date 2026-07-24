'use client';

import { DiscussWithCoachButton } from '@/components/coach/discuss-with-coach-button';
import { SessionRationaleCard } from '@/components/coach/plan/session-rationale-card';
import {
  PlannedSessionContextPanel,
  PlannedSessionContextPanelSkeleton,
} from '@/components/planning/session/planned-session-context-panel';
import { MorningProposalCompare } from '@/components/planning/session/morning-proposal-compare';
import { SessionRealization } from '@/components/planning/session/session-realization';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { useSessionRationalePresentation } from '@/hooks/use-data';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { activityTypeLabels, formatDate } from '@/lib/format';
import { formatPlannedSessionLocationDisplay } from '@/lib/planned-session/planned-session-display';
import { parseStrengthPrescription } from '@/lib/planned-session/strength-prescription';
import { sportIdentityHex } from '@/lib/activity/sport-identity';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { exposureLabels, intensityLabels } from '@/lib/planned-session/sessions';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import { Brain, ChevronRight, Dumbbell, MapPin, Pencil, Watch } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ActivityType } from '@prisma/client';

type KeyChip = { label: string; value: string; valueClassName?: string };

function KeyChipsRow({ chips }: { chips: KeyChip[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
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

function CollapsibleSection({
  icon: Icon,
  label,
  summary,
  defaultOpen,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  summary?: string | null;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-analysis-border/60 border-t" open={defaultOpen}>
      <summary className="hover:text-foreground flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="text-foreground/85 inline-flex min-w-0 items-center gap-1.5 font-medium">
          <Icon className="text-muted-foreground size-3.5 shrink-0" />
          {label}
        </span>
        <span className="text-muted-foreground/70 inline-flex min-w-0 items-center gap-1.5">
          {summary ? <span className="text-data truncate text-xs">{summary}</span> : null}
          <ChevronRight className="size-3.5 shrink-0 transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="pt-1 pb-3">{children}</div>
    </details>
  );
}

/**
 * Glanceable read layout for the planned-session modal.
 * Header + 3 key chips answer "what/when/how much" at a glance; rationale and
 * location/weather context fold into <details> so the modal doesn't dump
 * everything at once. Edit stays icon-only (Close is DialogContent's own X).
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
  const [pushing, setPushing] = useState(false);
  const isRealized = Boolean(session.activity) && !omitLinkedActivityNavigation;
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
  const rationaleOpenByDefault = rationaleVm?.suggested
    ? rationaleVm.suggested.gate.status !== 'ACCEPTED'
    : true;

  const chips: KeyChip[] = [
    { label: 'Durée', value: session.durationMin ? `${session.durationMin} min` : '—' },
    {
      label: 'Charge',
      value: session.load ? `${Math.round(session.load)} TSS` : '—',
      valueClassName: 'text-primary',
    },
    { label: 'Intensité', value: session.intensity ? intensityLabels[session.intensity] : '—' },
  ];

  const prescription = parseStrengthPrescription(session.strengthPrescription);

  async function sendToWatch() {
    if (pushing || !prescription) return;
    setPushing(true);
    const loadingToast = toast.loading('Envoi vers Garmin…');
    try {
      const response = await fetch('/api/garmin/workouts/from-planned-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plannedSessionId: session.id, schedule: true }),
      });
      const data = (await response.json()) as {
        error?: string;
        workoutName?: string;
        skipped?: Array<{ exercise: string }>;
        scheduledDate?: string | null;
      };
      if (!response.ok) throw new Error(data.error || 'Envoi impossible');
      const skipped = data.skipped?.length ?? 0;
      toast.success('Workout envoyé à Garmin', {
        description: [
          data.workoutName,
          data.scheduledDate ? `calendrier ${data.scheduledDate}` : null,
          skipped > 0 ? `${skipped} exercice(s) non mappé(s)` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Envoi vers Garmin impossible');
    } finally {
      toast.close(loadingToast);
      setPushing(false);
    }
  }

  return (
    <div className="space-y-4">
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
            className="shrink-0 rounded-full"
            size="icon-sm"
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
        {!morningProposal && session.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {session.description}
          </p>
        ) : null}
      </header>

      {morningProposal ? (
        <MorningProposalCompare proposal={morningProposal} />
      ) : (
        <KeyChipsRow chips={chips} />
      )}

      {session.type === ActivityType.STRENGTH && prescription ? (
        <div className="border-analysis-border/60 space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-foreground/85 inline-flex items-center gap-1.5 text-sm font-medium">
              <Dumbbell className="text-muted-foreground size-3.5" />
              Exercices prescrits
            </p>
            {!isRealized ? (
              <Button
                disabled={pushing}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void sendToWatch()}
              >
                <Watch className="size-3.5" />
                {pushing ? 'Envoi…' : 'Envoyer à la montre'}
              </Button>
            ) : null}
          </div>
          <ul className="space-y-1.5">
            {prescription.sets
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((set) => {
                const volume =
                  set.durationSec && set.durationSec > 0 && set.reps <= 0
                    ? `${set.sets}×${set.durationSec}s`
                    : `${set.sets}×${set.reps}`;
                const weight =
                  set.weightKg != null && set.weightKg > 0 ? ` @ ${set.weightKg} kg` : '';
                return (
                  <li
                    key={`${set.order}-${set.exercise}`}
                    className="text-muted-foreground flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="text-foreground min-w-0 truncate font-medium">
                      {set.exercise}
                    </span>
                    <span className="text-data shrink-0 font-mono text-xs tabular-nums">
                      {volume}
                      {weight}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}

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

      <div className="border-analysis-border/60 space-y-2 border-t pt-3">
        {!isRealized ? (
          <DiscussWithCoachButton
            className="w-full sm:w-auto"
            size="lg"
            target={{ kind: 'planned-session', sessionId: session.id }}
            variant="default"
          />
        ) : null}
        <SessionRealization
          omitLinkedActivityNavigation={omitLinkedActivityNavigation}
          session={session}
        />
      </div>
    </div>
  );
}
