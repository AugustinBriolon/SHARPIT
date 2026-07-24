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
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { useSessionRationalePresentation } from '@/hooks/use-data';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { activityTypeLabels, formatDate } from '@/lib/format';
import { formatPlannedSessionLocationDisplay } from '@/lib/planned-session/planned-session-display';
import { sportIdentityHex } from '@/lib/activity/sport-identity';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { exposureLabels, intensityLabels } from '@/lib/planned-session/sessions';
import type { MorningProposalCompareInput } from '@/lib/today/morning-proposal-compare';
import { Brain, ChevronRight, MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

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
