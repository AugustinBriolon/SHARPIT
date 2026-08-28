'use client';

import { useSyncExternalStore } from 'react';
import {
  readClientMorningHold,
  subscribeMorningHold,
} from '@/components/today/rich/morning-orientation-hold';
import { MorningOrientationReadyActions } from '@/components/today/rich/morning-orientation-ready-actions';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

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
    <MorningOrientationReadyActions
      orientation={orientation}
      trainingDayId={trainingDayId}
      onRefreshed={onRefreshed}
    />
  );
}
