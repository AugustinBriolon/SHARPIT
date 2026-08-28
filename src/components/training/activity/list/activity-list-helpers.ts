import type { ActivityListItem } from '@/components/training/activity/list/activity-list-types';
import { cn } from '@/lib/utils';

export function buildActivityChipClassName({
  selectionMode,
  selectable,
  selected,
}: {
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
}): string {
  return cn(
    selectionMode && !selectable && 'cursor-default opacity-50',
    selectionMode && selectable && selected && 'ring-primary/40 ring-2',
  );
}

export function buildActivityRowPanelClassName({
  compact,
  selectionMode,
  selectable,
  selected,
}: {
  compact: boolean;
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
}): string {
  return cn(
    'analysis-panel group rounded-analysis flex flex-col gap-3',
    compact ? 'px-4 py-3' : 'px-5 py-4',
    selectionMode && !selectable && 'cursor-default opacity-50',
    selectionMode && selectable && selected && 'ring-primary/40 ring-2',
    'pressable-lg hover:border-primary/30 hover:bg-analysis-surface-alt/60',
  );
}

export function handleActivitySelectionClick({
  selectionMode,
  selectable,
  activityId,
  onToggle,
}: {
  selectionMode: boolean;
  selectable: boolean;
  activityId: string;
  onToggle?: (activityId: string) => void;
}): void {
  if (!selectionMode || !selectable) {
    return;
  }
  onToggle?.(activityId);
}
