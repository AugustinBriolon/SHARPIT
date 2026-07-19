'use client';

import type { PlannedSessionSummary } from '@/components/training/activity-detail/types';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { LinkButton } from '@/components/ui/link-button';
import { PhysioRail } from '@/components/ui/physio-rail';
import { useActivityMutations } from '@/hooks/use-data';
import { activityTypeLabels, formatDate, formatDistance, formatDuration } from '@/lib/format';
import { formatActivityWeatherChip, parseActivityWeather } from '@/lib/activity/activity-weather';
import { parseSessionAnalysis } from '@/lib/session-analysis-display';
import { cn } from '@/lib/utils';
import { ActivityType } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ActivityItem = {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  load: number | null;
  weather: string | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  strengthSets: { exercise: string }[];
  plannedSession: PlannedSessionSummary | null;
};

export function ActivityList({
  activities,
  emptyLabel,
  compact = false,
  variant = 'panel',
}: {
  activities: ActivityItem[];
  emptyLabel?: string;
  compact?: boolean;
  /** `chip` = training dashboard density; `panel` = history (may keep PhysioRail). */
  variant?: 'panel' | 'chip';
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

  if (variant === 'chip') {
    return (
      <ul className="space-y-2">
        {activities.map((activity) => (
          <li key={activity.id}>
            <ActivityChip activity={activity} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityRow key={activity.id} activity={activity} compact={compact} />
      ))}
    </div>
  );
}

function formatActivityWeatherLine(raw: string | null): string | null {
  const weather = parseActivityWeather(raw);
  return weather ? formatActivityWeatherChip(weather) : raw?.trim() || null;
}

function ActivityChip({ activity }: { activity: ActivityItem }) {
  const summary = getActivitySummary(activity);
  const loadValue = activity.load != null ? Math.round(activity.load) : null;
  const title = activity.title ?? activityTypeLabels[activity.type];

  return (
    <Link
      href={`/training/${activity.id}`}
      title={`Voir le détail — ${title}`}
      className={cn(
        'border-analysis-border/80 bg-background/50 hover:border-primary/35 hover:bg-muted/40',
        'focus-visible:ring-primary/35 flex w-full min-w-0 items-center justify-between gap-2',
        'rounded-lg border px-3 py-2.5 transition-[border-color,background-color] duration-150',
        'focus-visible:ring-2 focus-visible:outline-hidden',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ActivityTypeIndicator type={activity.type} />
        <span className="line-clamp-1 min-w-0 text-sm font-medium">{title}</span>
        <span className="text-data text-muted-foreground shrink-0 text-xs">
          {formatDate(new Date(activity.date))}
          {' · '}
          {formatDuration(activity.duration)}
          {summary ? ` · ${summary}` : ''}
          {loadValue != null ? ` · ${loadValue}` : ''}
        </span>
      </span>
      <span
        className="text-muted-foreground/70 text-data shrink-0 text-[10px] tracking-wider"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

function ActivityRow({ activity, compact = false }: { activity: ActivityItem; compact?: boolean }) {
  const summary = getActivitySummary(activity);
  const weatherLine = formatActivityWeatherLine(activity.weather);
  const analysis = activity.plannedSession
    ? parseSessionAnalysis(activity.plannedSession.analysis)
    : null;
  const loadValue = activity.load != null ? Math.round(activity.load) : null;
  let railLabel = 'charge non disponible';
  if (loadValue != null) {
    railLabel = `charge estimée ${loadValue} tss`;
  }
  const summaryLine =
    analysis?.summary ?? 'Lecture rapide de la charge et de la conformité de séance.';

  return (
    <Link
      href={`/training/${activity.id}`}
      className={[
        'analysis-panel group hover:border-primary/30 hover:bg-analysis-surface-alt/60 rounded-analysis flex flex-col gap-3 transition-colors',
        compact ? 'px-4 py-3' : 'px-5 py-4',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="w-full min-w-0 space-y-1">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <ActivityTypeIndicator type={activity.type} />
              <span className={compact ? 'text-sm font-medium' : 'font-medium'}>
                {activity.title ?? activityTypeLabels[activity.type]}
              </span>
            </div>
            {activity.plannedSession && (
              <span className="border-analysis-border bg-analysis-surface-alt text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                Planifiée{' '}
                {analysis ? (
                  <span className="text-data text-foreground">{analysis.complianceScore}/100</span>
                ) : null}
              </span>
            )}
          </div>
          <p
            className={compact ? 'text-muted-foreground text-xs' : 'text-muted-foreground text-sm'}
          >
            {formatDate(new Date(activity.date))} · {formatDuration(activity.duration)}
            {summary && !compact ? ` · ${summary}` : ''}
            {weatherLine ? ` · ${weatherLine}` : ''}
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
        <PhysioRail markerLabel={railLabel} max={180} value={loadValue} />
        {!compact && (
          <div className="text-muted-foreground truncate text-xs sm:text-right">{summaryLine}</div>
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
  const { remove } = useActivityMutations();
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Supprimer cette séance ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    remove.mutate(id);
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
