'use client';

import { ActivityType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { LinkButton } from '@/components/ui/link-button';
import { queryKeys } from '@/lib/query/keys';
import {
  activityTypeColors,
  activityTypeLabels,
  formatDate,
  formatDistance,
  formatDuration,
} from '@/lib/format';
import type { PlannedSessionSummary } from '@/components/training/planned-session-link-card';
import { parseSessionAnalysis, sessionScoreColor } from '@/lib/session-analysis-display';

type ActivityItem = {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  load: number | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  strengthSets: { exercise: string }[];
  plannedSession: PlannedSessionSummary | null;
};

export function ActivityList({
  activities,
  emptyLabel,
}: {
  activities: ActivityItem[];
  emptyLabel?: string;
}) {
  if (!activities.length) {
    return (
      <div className="border-border/80 rounded-xl border border-dashed p-12 text-center">
        <p className="text-muted-foreground">{emptyLabel ?? 'Aucune séance enregistrée.'}</p>
        {!emptyLabel && (
          <LinkButton className="mt-4" href="/training/manual">
            Saisir une séance manuellement
          </LinkButton>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const summary = getActivitySummary(activity);
  const analysis = activity.plannedSession
    ? parseSessionAnalysis(activity.plannedSession.analysis)
    : null;

  return (
    <Link
      className="group border-border bg-card hover:border-primary/30 hover:bg-muted/30 flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors"
      href={`/training/${activity.id}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={activityTypeColors[activity.type]} variant="outline">
            {activityTypeLabels[activity.type]}
          </Badge>
          <span className="font-medium">{activity.title ?? activityTypeLabels[activity.type]}</span>
          {activity.plannedSession && (
            <span className="border-primary/20 bg-primary/5 text-primary rounded-full border px-2 py-0.5 text-[10px] font-medium">
              Planifiée
              {analysis ? (
                <span className={sessionScoreColor(analysis.complianceScore)}>
                  {' '}
                  · {analysis.complianceScore}/100
                </span>
              ) : null}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {formatDate(new Date(activity.date))} · {formatDuration(activity.duration)}
          {summary ? ` · ${summary}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {activity.load != null && (
          <p className="text-primary font-mono text-sm">{Math.round(activity.load)} TSS</p>
        )}
      </div>
    </Link>
  );
}

function getActivitySummary(activity: ActivityItem) {
  switch (activity.type) {
    case ActivityType.RUN:
      return formatDistance(activity.runMetrics?.distanceM);
    case ActivityType.BIKE:
      return activity.bikeMetrics?.tss ? `${Math.round(activity.bikeMetrics.tss)} TSS` : undefined;
    case ActivityType.SWIM:
      return formatDistance(activity.swimMetrics?.distanceM);
    case ActivityType.STRENGTH:
      return activity.strengthSets.map((s) => s.exercise).join(', ');
    case ActivityType.TRIATHLON:
      return activity.load != null ? `${Math.round(activity.load)} TSS` : 'Multisport';
    case ActivityType.OTHER:
      return activity.load != null ? `${Math.round(activity.load)} TSS` : undefined;
    default:
      return undefined;
  }
}

export function DeleteActivityButton({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Supprimer cette séance ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    // La liste /training est pilotée par React Query : l'invalidation suffit,
    // pas besoin de router.refresh() (qui re-render inutilement l'arbre serveur).
    router.push('/training');
  }

  return (
    <>
      <Button size="sm" variant="destructive" onClick={handleDelete}>
        Supprimer
      </Button>
      {dialog}
    </>
  );
}
