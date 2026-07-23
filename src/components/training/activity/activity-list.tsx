'use client';

import type { PlannedSessionSummary } from '@/components/training/activity/detail/types';
import { ActivityTypeIndicator } from '@/components/activity/activity-type-indicator';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { LinkButton } from '@/components/ui/link-button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { InstrumentListChip } from '@/components/ui/instrument-list-chip';
import { PhysioRail } from '@/components/ui/physio-rail';
import { useActivityMutations } from '@/hooks/use-data';
import {
  getActivityListMetric,
  shouldShowActivityListLoad,
} from '@/lib/activity/activity-list-summary';
import { formatActivityWeatherChip, parseActivityWeather } from '@/lib/activity/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/indoor-activity';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { parseSessionAnalysis } from '@/lib/planned-session/session-analysis-display';
import { cn } from '@/lib/utils';
import { ActivityType } from '@prisma/client';
import { CheckCircle2, Dumbbell } from 'lucide-react';
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
  chipListClassName,
  recordLabelsById,
}: {
  activities: ActivityItem[];
  emptyLabel?: string;
  compact?: boolean;
  /** `chip` = training dashboard density; `panel` = history (may keep PhysioRail). */
  variant?: 'panel' | 'chip';
  /** Extra classes for the chip-variant `<ul>` (e.g. multi-column history grid). */
  chipListClassName?: string;
  /** activityId → record badge label (chip variant, Bande ink §12). */
  recordLabelsById?: Map<string, string>;
}) {
  if (!activities.length) {
    const description = emptyLabel
      ? undefined
      : 'Commence par une saisie manuelle ou synchronise une source connectée.';
    const action = emptyLabel ? undefined : (
      <LinkButton className="mt-1" href="/training/manual" size="sm">
        Saisir une séance manuellement
      </LinkButton>
    );

    return (
      <InkEmptyState
        action={action}
        description={description}
        icon={Dumbbell}
        title={emptyLabel ?? 'Aucune séance enregistrée'}
        bleed
      />
    );
  }

  if (variant === 'chip') {
    return (
      <ul className={cn('space-y-2', chipListClassName)}>
        {activities.map((activity) => (
          <li key={activity.id} className="min-w-0">
            <ActivityChip
              activity={activity}
              recordLabel={recordLabelsById?.get(activity.id) ?? null}
            />
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

function formatActivityWeatherLine(
  activity: Pick<ActivityItem, 'type' | 'title' | 'weather'>,
): string | null {
  if (isIndoorActivitySession(activity)) return null;
  const weather = parseActivityWeather(activity.weather);
  return weather ? formatActivityWeatherChip(weather) : activity.weather?.trim() || null;
}

function ActivityChip({
  activity,
  recordLabel = null,
}: {
  activity: ActivityItem;
  recordLabel?: string | null;
}) {
  const metric = getActivityListMetric(activity);
  const loadValue = shouldShowActivityListLoad(activity)
    ? Math.round(activity.load as number)
    : null;
  const title = activity.title ?? activityTypeLabels[activity.type];
  const meta = [
    formatDate(new Date(activity.date)),
    formatDuration(activity.duration),
    metric,
    loadValue != null ? String(loadValue) : undefined,
  ].filter((part): part is string => Boolean(part));

  return (
    <InstrumentListChip
      activityType={activity.type}
      href={`/training/${activity.id}`}
      meta={meta}
      showArrow={false}
      title={title}
      trailing={
        <>
          {recordLabel ? (
            <span className="border-analysis-border text-muted-foreground rounded-full border px-2 py-0.5 text-[9.5px] whitespace-nowrap">
              {recordLabel}
            </span>
          ) : null}
          <CheckCircle2 className="text-primary size-3.5" aria-hidden />
        </>
      }
    />
  );
}

function ActivityRow({ activity, compact = false }: { activity: ActivityItem; compact?: boolean }) {
  const metric = getActivityListMetric(activity);
  const weatherLine = formatActivityWeatherLine(activity);
  const analysis = activity.plannedSession
    ? parseSessionAnalysis(activity.plannedSession.analysis)
    : null;
  const loadValue = activity.load != null ? Math.round(activity.load) : null;
  let railLabel = 'charge non disponible';
  if (loadValue != null) {
    railLabel = `charge estimée ${loadValue} tss`;
  }
  const metaParts = [
    formatDate(new Date(activity.date)),
    formatDuration(activity.duration),
    !compact ? metric : undefined,
    !compact ? weatherLine : undefined,
  ].filter((part): part is string => Boolean(part));

  return (
    <Link
      href={`/training/${activity.id}`}
      className={[
        'analysis-panel group hover:border-primary/30 hover:bg-analysis-surface-alt/60 rounded-analysis flex flex-col gap-3 transition-colors',
        compact ? 'px-4 py-3' : 'px-5 py-4',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="w-full min-w-0 space-y-1.5">
          <div className="flex w-full items-center justify-between gap-2">
            <span
              className={cn(
                'line-clamp-1 min-w-0',
                compact ? 'text-sm font-medium' : 'font-medium',
              )}
            >
              {activity.title ?? activityTypeLabels[activity.type]}
            </span>
            {activity.plannedSession && (
              <span className="border-analysis-border bg-analysis-surface-alt text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                {analysis ? 'Conformité' : 'Liée au plan'}{' '}
                {analysis ? (
                  <span className="text-data text-foreground">{analysis.complianceScore}/100</span>
                ) : null}
              </span>
            )}
          </div>
          <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 text-[11px]">
            <ActivityTypeIndicator type={activity.type} />
            {metaParts.map((part, index) => (
              <span key={`row-meta-${index}`} className="contents">
                <span className="opacity-30" aria-hidden>
                  ·
                </span>
                <span className="text-data">{part}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
      <PhysioRail markerLabel={railLabel} max={180} value={loadValue} />
    </Link>
  );
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
