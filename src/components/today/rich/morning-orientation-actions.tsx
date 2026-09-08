'use client';

import { useSyncExternalStore } from 'react';
import {
  readClientMorningHold,
  subscribeMorningHold,
} from '@/components/today/rich/morning-orientation-hold';
import { MorningOrientationReadyActions } from '@/components/today/rich/morning-orientation-ready-actions';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  activityStatusOption,
  getActivityStatusServerSnapshot,
  getActivityStatusSnapshot,
  subscribeActivityStatus,
} from '@/lib/health/activity-status';

export {
  morningHoldStorageKey,
  readClientMorningHold,
  writeClientMorningHold,
} from '@/components/today/rich/morning-orientation-hold';

export function useClientMorningHold(trainingDayId: string): boolean {
  return useSyncExternalStore(
    subscribeMorningHold,
    () => readClientMorningHold(trainingDayId),
    () => false,
  );
}

type MorningOrientation = NonNullable<TodayViewModel['morningOrientation']>;

function ActivityStatusOrientationNote() {
  const status = useSyncExternalStore(
    subscribeActivityStatus,
    getActivityStatusSnapshot,
    getActivityStatusServerSnapshot,
  );
  if (status === 'active') {
    return null;
  }
  const option = activityStatusOption(status);
  return (
    <p
      className="border-border bg-muted/40 text-muted-foreground rounded-lg border px-3 py-2 text-xs text-pretty"
      role="status"
    >
      Mode {option.label} : {option.planningImpact}
    </p>
  );
}

export function MorningOrientationActions({
  trainingDayId,
  orientation,
  onRefreshed,
}: {
  trainingDayId: string;
  orientation: MorningOrientation;
  onRefreshed?: () => void;
}) {
  if (orientation.phase === 'POST_CHOICE') {
    return null;
  }

  return (
    <div className="space-y-2">
      <ActivityStatusOrientationNote />
      <MorningOrientationReadyActions
        orientation={orientation}
        trainingDayId={trainingDayId}
        onRefreshed={onRefreshed}
      />
    </div>
  );
}
