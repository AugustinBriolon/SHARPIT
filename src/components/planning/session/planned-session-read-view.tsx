'use client';

import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { SessionRationaleCard } from '@/components/coach/plan/session-rationale-card';
import {
  PlannedSessionContextPanel,
  PlannedSessionContextPanelSkeleton,
} from '@/components/planning/session/planned-session-context-panel';
import { SessionRealization } from '@/components/planning/session/session-realization';
import { Button } from '@/components/ui/button';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { activityTypeLabels, formatDate } from '@/lib/format';
import { formatPlannedSessionLocationDisplay } from '@/lib/planned-session/planned-session-display';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { exposureLabels, intensityLabels } from '@/lib/planned-session/sessions';
import { Pencil } from 'lucide-react';

type Fact = { label: string; value: string };

/**
 * Dense read layout for the planned-session modal.
 * Mobile: no duplicate eyebrow (dialog title owns it), icon-only edit, compact facts.
 */
export function PlannedSessionReadView({
  session,
  goals,
  context,
  contextPending = false,
  onEdit,
  omitLinkedActivityNavigation = false,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending?: boolean;
  onEdit: () => void;
  omitLinkedActivityNavigation?: boolean;
}) {
  const isRealized = Boolean(session.activity) && !omitLinkedActivityNavigation;
  const goal = goals.find((g) => g.id === session.goalId);
  const showExposure = sportSupportsOutdoorContext(session.type);
  const exposure = session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined;

  const durationLabel = session.durationMin ? `${session.durationMin} min` : null;
  const loadLabel = session.load ? `${Math.round(session.load)} TSS` : null;
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

  const facts: Fact[] = [];
  if (session.intensity) {
    facts.push({ label: 'Intensité', value: intensityLabels[session.intensity] });
  }
  if (goal) facts.push({ label: 'Objectif', value: goal.title });
  if (locationValue) facts.push({ label: 'Lieu', value: locationValue });

  const metaParts = [dateLabel, durationLabel, loadLabel].filter(Boolean);

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="flex items-start gap-2.5">
        <ActivityTypeIndicator type={session.type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-card-title min-w-0 leading-snug">
              {session.title?.trim() || activityTypeLabels[session.type]}
            </h2>
            <Button
              aria-label="Modifier la séance"
              className="shrink-0 sm:hidden"
              size="icon-sm"
              type="button"
              variant="outline"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              className="hidden shrink-0 sm:inline-flex"
              size="sm"
              type="button"
              variant="outline"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
              Modifier
            </Button>
          </div>
          {metaParts.length > 0 ? (
            <p className="text-muted-foreground mt-1 text-xs leading-snug sm:text-sm">
              {metaParts.join(' · ')}
            </p>
          ) : null}
          {isRealized ? (
            <p className="text-primary mt-1 text-[11px] font-medium tracking-wide">Réalisée</p>
          ) : null}
        </div>
      </header>

      {facts.length > 0 || session.description ? (
        <dl className="border-analysis-border/70 bg-analysis-surface-alt/60 divide-analysis-border/50 sm:rounded-analysis-lg divide-y rounded-lg border px-3 py-1 sm:px-4 sm:py-1.5">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-baseline justify-between gap-3 py-2 sm:grid sm:grid-cols-[7rem_1fr] sm:justify-start sm:gap-3 sm:py-2.5"
            >
              <dt className="text-label shrink-0">{fact.label}</dt>
              <dd className="text-foreground min-w-0 text-right text-sm leading-snug sm:text-left">
                {fact.value}
              </dd>
            </div>
          ))}
          {session.description ? (
            <div className="py-2 sm:py-2.5">
              <dt className="text-label">Description</dt>
              <dd className="text-foreground mt-1 text-sm leading-relaxed">
                {session.description}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <SessionRealization
        omitLinkedActivityNavigation={omitLinkedActivityNavigation}
        session={session}
      />

      <SessionRationaleCard sessionId={session.id} />

      {showContextPanel && context ? (
        <PlannedSessionContextPanel
          sessionId={session.id}
          viewModel={context}
          onChangeLocation={onEdit}
        />
      ) : null}
      {showContextSkeleton ? <PlannedSessionContextPanelSkeleton /> : null}
    </div>
  );
}
