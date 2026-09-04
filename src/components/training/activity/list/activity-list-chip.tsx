'use client';

import { InstrumentListChip } from '@/components/ui/instruments/instrument-list-chip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getActivityListMetric,
  shouldShowActivityListLoad,
} from '@/lib/activity/list/activity-list-summary';
import { activityTypeLabels, formatDate, formatDuration } from '@/lib/format';
import { CheckCircle2 } from 'lucide-react';
import {
  isSelectableHike,
  type ActivityListItem,
} from '@/components/training/activity/list/activity-list-types';
import {
  buildActivityChipClassName,
  handleActivitySelectionClick,
} from '@/components/training/activity/list/activity-list-helpers';

function buildActivityChipMeta(activity: ActivityListItem): string[] {
  const metric = getActivityListMetric(activity);
  const loadValue = shouldShowActivityListLoad(activity)
    ? Math.round(activity.load as number)
    : null;
  return [
    formatDate(new Date(activity.date)),
    formatDuration(activity.duration),
    metric,
    loadValue !== null ? String(loadValue) : undefined,
  ].filter((part): part is string => Boolean(part));
}

function ActivityChipTrailing({
  selectionMode,
  selectable,
  selected,
  recordLabel,
  activityId,
  onToggle,
}: {
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  recordLabel: string | null;
  activityId: string;
  onToggle?: (activityId: string) => void;
}) {
  if (selectionMode && selectable) {
    return (
      <Checkbox
        aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
        checked={selected}
        onCheckedChange={() => onToggle?.(activityId)}
        onClick={(event) => event.stopPropagation()}
      />
    );
  }
  if (!selectionMode && recordLabel) {
    return (
      <span className="border-analysis-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs whitespace-nowrap">
        {recordLabel}
      </span>
    );
  }
  if (!selectionMode) {
    return <CheckCircle2 className="text-primary size-3.5" aria-hidden />;
  }
  return null;
}

export function ActivityChip({
  activity,
  recordLabel = null,
  selectionMode = false,
  selected = false,
  onToggle,
}: {
  activity: ActivityListItem;
  recordLabel?: string | null;
  selectionMode?: boolean;
  selected?: boolean;
  onToggle?: (activityId: string) => void;
}) {
  const title = activity.title ?? activityTypeLabels[activity.type];
  const meta = buildActivityChipMeta(activity);
  const selectable = isSelectableHike(activity);

  function handleClick() {
    handleActivitySelectionClick({
      selectionMode,
      selectable,
      activityId: activity.id,
      onToggle,
    });
  }

  return (
    <InstrumentListChip
      activityType={activity.type}
      className={buildActivityChipClassName({ selectionMode, selectable, selected })}
      href={selectionMode ? undefined : `/training/${activity.id}`}
      meta={meta}
      showArrow={false}
      title={title}
      trailing={
        <ActivityChipTrailing
          activityId={activity.id}
          recordLabel={recordLabel}
          selectable={selectable}
          selected={selected}
          selectionMode={selectionMode}
          onToggle={onToggle}
        />
      }
      onClick={selectionMode ? handleClick : undefined}
    />
  );
}
