'use client';

import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { PhysioRail } from '@/components/ui/instruments/physio-rail';
import { Checkbox } from '@/components/ui/checkbox';
import { getActivityListMetric } from '@/lib/activity/list/activity-list-summary';
import {
  formatActivityWeatherChip,
  parseActivityWeather,
} from '@/lib/activity/weather/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/location/indoor-activity';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { parseSessionAnalysis } from '@/lib/planned-session/display/session-analysis-display';
import { prefetchActivityDetail } from '@/lib/query/prefetch-activity-detail';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  isSelectableHike,
  type ActivityListItem,
} from '@/components/training/activity/list/activity-list-types';
import {
  buildActivityRowPanelClassName,
  handleActivitySelectionClick,
} from '@/components/training/activity/list/activity-list-helpers';

function formatActivityWeatherLine(
  activity: Pick<ActivityListItem, 'type' | 'title' | 'weather'>,
): string | null {
  if (isIndoorActivitySession(activity)) {
    return null;
  }
  const weather = parseActivityWeather(activity.weather);
  return weather ? formatActivityWeatherChip(weather) : activity.weather?.trim() || null;
}

function buildRowMetaParts({
  activity,
  compact,
  metric,
  weatherLine,
}: {
  activity: ActivityListItem;
  compact: boolean;
  metric: string | null;
  weatherLine: string | null;
}) {
  return [
    formatDate(new Date(activity.date)),
    formatDuration(activity.duration),
    !compact ? metric : undefined,
    !compact ? weatherLine : undefined,
  ].filter((part): part is string => Boolean(part));
}

function buildRailLabel(loadValue: number | null): string {
  if (loadValue === null) {
    return 'charge non disponible';
  }
  return `charge estimée ${loadValue} tss`;
}

function PlannedSessionBadge({
  plannedSession,
}: {
  plannedSession: ActivityListItem['plannedSession'];
}) {
  if (!plannedSession) {
    return null;
  }
  const analysis = parseSessionAnalysis(plannedSession.analysis);
  return (
    <span className="border-analysis-border bg-analysis-surface-alt text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
      {analysis ? 'Conformité' : 'Liée au plan'}{' '}
      {analysis ? (
        <span className="text-data text-foreground">{analysis.complianceScore}/100</span>
      ) : null}
    </span>
  );
}

function ActivityRowHeader({
  activity,
  compact,
  selectionMode,
  selectable,
  selected,
  onToggle,
}: {
  activity: ActivityListItem;
  compact: boolean;
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  onToggle?: (activityId: string) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className={cn('line-clamp-1 min-w-0', compact ? 'text-sm font-medium' : 'font-medium')}>
        {activity.title ?? activityTypeLabels[activity.type]}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {selectionMode && selectable ? (
          <Checkbox
            aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
            checked={selected}
            onCheckedChange={() => onToggle?.(activity.id)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : null}
        {!selectionMode ? <PlannedSessionBadge plannedSession={activity.plannedSession} /> : null}
      </span>
    </div>
  );
}

function ActivityRowMetaLine({
  activity,
  metaParts,
}: {
  activity: ActivityListItem;
  metaParts: string[];
}) {
  return (
    <span className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
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
  );
}

function ActivityRowContent({
  activity,
  compact,
  selectionMode,
  selectable,
  selected,
  metaParts,
  railLabel,
  loadValue,
  onToggle,
}: {
  activity: ActivityListItem;
  compact: boolean;
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  metaParts: string[];
  railLabel: string;
  loadValue: number | null;
  onToggle?: (activityId: string) => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="w-full min-w-0 space-y-1.5">
          <ActivityRowHeader
            activity={activity}
            compact={compact}
            selectable={selectable}
            selected={selected}
            selectionMode={selectionMode}
            onToggle={onToggle}
          />
          <ActivityRowMetaLine activity={activity} metaParts={metaParts} />
        </div>
      </div>
      <PhysioRail markerLabel={railLabel} max={180} value={loadValue} />
    </>
  );
}

export function ActivityRow({
  activity,
  compact = false,
  selectionMode = false,
  selected = false,
  onToggle,
}: {
  activity: ActivityListItem;
  compact?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggle?: (activityId: string) => void;
}) {
  const queryClient = useQueryClient();
  const metric = getActivityListMetric(activity);
  const weatherLine = formatActivityWeatherLine(activity);
  const loadValue = activity.load !== null ? Math.round(activity.load) : null;
  const metaParts = buildRowMetaParts({ activity, compact, metric: metric ?? null, weatherLine });
  const selectable = isSelectableHike(activity);
  const railLabel = buildRailLabel(loadValue);

  const panelClassName = buildActivityRowPanelClassName({
    compact,
    selectionMode,
    selectable,
    selected,
  });

  const content = (
    <ActivityRowContent
      activity={activity}
      compact={compact}
      loadValue={loadValue}
      metaParts={metaParts}
      railLabel={railLabel}
      selectable={selectable}
      selected={selected}
      selectionMode={selectionMode}
      onToggle={onToggle}
    />
  );

  function handleClick() {
    handleActivitySelectionClick({
      selectionMode,
      selectable,
      activityId: activity.id,
      onToggle,
    });
  }

  if (selectionMode) {
    return (
      <button className={panelClassName} type="button" onClick={handleClick}>
        {content}
      </button>
    );
  }

  return (
    <Link
      className={panelClassName}
      href={`/training/${activity.id}`}
      onPointerEnter={() => prefetchActivityDetail(queryClient, activity.id, activity.type)}
    >
      {content}
    </Link>
  );
}
