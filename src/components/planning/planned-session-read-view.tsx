'use client';

import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { PlannedSessionContextPanel } from '@/components/planning/planned-session-context-panel';
import { SessionRationaleCard } from '@/components/coach/session-rationale-card';
import { SessionRealization } from '@/components/planning/session-realization';
import { Button } from '@/components/ui/button';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import type { PlannedSessionViewModel } from '@/core/presentation/planned-session-view-model';
import { activityTypeLabels, formatDate } from '@/lib/format';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { exposureLabels, intensityLabels } from '@/lib/sessions';
import { Pencil } from 'lucide-react';

function ReadField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

export function PlannedSessionReadView({
  session,
  goals,
  context,
  onEdit,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  onEdit: () => void;
}) {
  const isRealized = Boolean(session.activity);
  const goal = goals.find((g) => g.id === session.goalId);
  const showExposure = sportSupportsOutdoorContext(session.type);
  const exposure = session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined;

  const durationLabel = session.durationMin ? `${session.durationMin} min` : null;
  const loadLabel = session.load ? `${Math.round(session.load)} TSS` : null;
  const dateLabel =
    formatDate(new Date(session.date)) + (session.startTime ? ` · ${session.startTime}` : '');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ActivityTypeIndicator type={session.type} />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {isRealized ? 'Séance réalisée' : 'Séance planifiée'}
            </p>
            <h2 className="font-heading mt-1 text-lg font-semibold">
              {session.title?.trim() || activityTypeLabels[session.type]}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {activityTypeLabels[session.type]} · {dateLabel}
              {durationLabel ? ` · ${durationLabel}` : ''}
              {loadLabel ? ` · ${loadLabel}` : ''}
            </p>
          </div>
        </div>
        <Button className="shrink-0" size="sm" type="button" variant="outline" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Modifier
        </Button>
      </div>

      <div className="border-border/60 bg-muted/20 grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2">
        {session.intensity && (
          <ReadField label="Intensité" value={intensityLabels[session.intensity]} />
        )}
        {goal && <ReadField label="Objectif lié" value={goal.title} />}
        {showExposure && exposure && (
          <ReadField
            label="Lieu d'entraînement"
            value={session.locationLabel + ' · ' + exposureLabels[exposure]}
          />
        )}
        {session.description && (
          <ReadField className="md:col-span-2" label="Description" value={session.description} />
        )}
      </div>

      <SessionRealization session={session} />

      <SessionRationaleCard sessionId={session.id} />

      {context?.visible ? <PlannedSessionContextPanel viewModel={context} /> : null}
    </div>
  );
}
