'use client';

import { useDisplayMode } from '@/providers/display-mode-provider';
import { formatDuration } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import type { ClientPlannedSession } from '@/lib/query/types';

function doneFeelingLabel(activity: NonNullable<ClientPlannedSession['activity']>): string {
  if (activity.rpe !== null) {
    return `RPE ${activity.rpe}`;
  }
  if (activity.feeling?.trim()) {
    return activity.feeling;
  }
  return '—';
}

export function PlannedVsDoneStrip({ session }: { session: ClientPlannedSession }) {
  const { mode } = useDisplayMode();
  const { activity } = session;
  if (!activity) {
    return null;
  }

  const plannedDuration = session.durationMin !== null ? `${session.durationMin} min` : '—';
  const doneDuration = activity.duration !== null ? formatDuration(activity.duration) : '—';
  const plannedLoad = session.load !== null ? formatTrainingLoad(session.load, mode) : '—';
  const doneLoad = activity.load !== null ? formatTrainingLoad(activity.load, mode) : '—';
  const plannedIntensity = session.intensity ? intensityLabels[session.intensity] : '—';
  const doneFeeling = doneFeelingLabel(activity);

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
