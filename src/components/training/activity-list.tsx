'use client';

import { ActivityType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { queryKeys } from '@/lib/query/keys';
import {
  activityTypeColors,
  activityTypeLabels,
  formatDate,
  formatDistance,
  formatDuration,
} from '@/lib/format';

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
};

export function ActivityList({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) {
    return (
      <div className="border-border/80 rounded-xl border border-dashed p-12 text-center">
        <p className="text-muted-foreground">Aucune séance enregistrée.</p>
        <LinkButton className="mt-4" href="/training/new">
          Ajouter une séance
        </LinkButton>
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

  return (
    <Link
      className="group border-border bg-card hover:border-primary/30 hover:bg-muted/30 flex items-center justify-between rounded-xl border px-5 py-4 transition-colors"
      href={`/training/${activity.id}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Badge className={activityTypeColors[activity.type]} variant="outline">
            {activityTypeLabels[activity.type]}
          </Badge>
          <span className="font-medium">{activity.title ?? activityTypeLabels[activity.type]}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          {formatDate(new Date(activity.date))} · {formatDuration(activity.duration)}
          {summary ? ` · ${summary}` : ''}
        </p>
      </div>
      <div className="text-right">
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
    default:
      return undefined;
  }
}

export function DeleteActivityButton({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleDelete() {
    if (!confirm('Supprimer cette séance ?')) return;
    await fetch(`/api/activities/${id}`, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: queryKeys.activities });
    // La liste /training est pilotée par React Query : l'invalidation suffit,
    // pas besoin de router.refresh() (qui re-render inutilement l'arbre serveur).
    router.push('/training');
  }

  return (
    <Button size="sm" variant="destructive" onClick={handleDelete}>
      Supprimer
    </Button>
  );
}
