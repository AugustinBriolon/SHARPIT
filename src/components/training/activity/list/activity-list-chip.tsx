'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { CompletedSessionPreview } from '@/components/today/rich/completed-session-preview';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { buildCompletedSessionMetrics } from '@/lib/today/rich/completed-session-metrics';
import { TWIN_DRILL_DOWN } from '@/lib/today/navigation/today-twin-navigation';
import { activityTypeLabels } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  isSelectableHike,
  type ActivityListItem,
} from '@/components/training/activity/list/activity-list-types';
import {
  buildActivityChipClassName,
  handleActivitySelectionClick,
} from '@/components/training/activity/list/activity-list-helpers';

type ActivityChipSource = ActivityListItem & {
  rpe?: number | null;
  bikeMetrics?: { tss: number | null; avgPower?: number | null } | null;
  hikeMetrics?: { distanceM: number | null; elevationM?: number | null } | null;
};

function metricsFromActivity(activity: ActivityChipSource) {
  return buildCompletedSessionMetrics({
    type: activity.type,
    duration: activity.duration,
    load: activity.load,
    rpe: activity.rpe ?? null,
    runMetrics: activity.runMetrics,
    bikeMetrics: activity.bikeMetrics
      ? {
          tss: activity.bikeMetrics.tss,
          avgPower: activity.bikeMetrics.avgPower ?? null,
        }
      : null,
    swimMetrics: activity.swimMetrics,
    hikeMetrics: activity.hikeMetrics
      ? {
          distanceM: activity.hikeMetrics.distanceM,
          elevationM: activity.hikeMetrics.elevationM ?? null,
        }
      : null,
    strengthSets: activity.strengthSets ?? [],
  });
}

function SelectionModeChip({
  activity,
  selectable,
  selected,
  onToggle,
}: {
  activity: ActivityChipSource;
  selectable: boolean;
  selected: boolean;
  onToggle?: (activityId: string) => void;
}) {
  const title = activity.title ?? activityTypeLabels[activity.type];

  return (
    <button
      type="button"
      className={cn(
        'analysis-panel rounded-analysis flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left',
        'pressable-lg focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        buildActivityChipClassName({ selectionMode: true, selectable, selected }),
      )}
      onClick={() =>
        handleActivitySelectionClick({
          selectionMode: true,
          selectable,
          activityId: activity.id,
          onToggle,
        })
      }
    >
      <ActivityTypeIndicator type={activity.type} />
      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      {selectable ? (
        <Checkbox
          aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
          checked={selected}
          onCheckedChange={() => onToggle?.(activity.id)}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
    </button>
  );
}

/**
 * History row — shared `CompletedSessionPreview` (same card as Plan / Today done).
 * Selection mode keeps a compact toggle surface for hike-trip linking.
 */
export function ActivityChip({
  activity,
  recordLabel = null,
  selectionMode = false,
  selected = false,
  mapEnabled = true,
  onToggle,
}: {
  activity: ActivityChipSource;
  recordLabel?: string | null;
  selectionMode?: boolean;
  selected?: boolean;
  /** Gate GPS stream fetch — virtualized lists keep this true only for mounted rows. */
  mapEnabled?: boolean;
  onToggle?: (activityId: string) => void;
}) {
  if (selectionMode) {
    return (
      <SelectionModeChip
        activity={activity}
        selectable={isSelectableHike(activity)}
        selected={selected}
        onToggle={onToggle}
      />
    );
  }

  const title = activity.title ?? activityTypeLabels[activity.type];

  return (
    <div className="relative">
      <CompletedSessionPreview
        accessibleName={`${title}, réalisé`}
        activityId={activity.id}
        activityType={activity.type}
        href={TWIN_DRILL_DOWN.activity(activity.id)}
        layout="column"
        mapEnabled={mapEnabled}
        metrics={metricsFromActivity(activity)}
        title={title}
      />
      {recordLabel ? (
        <span className="border-analysis-border bg-background text-muted-foreground absolute top-2 right-2 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap">
          {recordLabel}
        </span>
      ) : null}
    </div>
  );
}
