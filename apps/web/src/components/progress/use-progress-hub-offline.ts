'use client';

import { format } from 'date-fns';
import { useGoals } from '@/hooks/use-data';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import {
  useBodyPresentationViewModel,
  usePhysicalHealthViewModel,
} from '@/hooks/use-presentation-view-model';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { isSet } from '@/lib/util/value';

export function useProgressHubOffline() {
  const online = useOnlineStatus();
  const { date } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const goalsQuery = useGoals();
  const bodyQuery = useBodyPresentationViewModel();
  const healthQuery = usePhysicalHealthViewModel(trainingDayId);
  const hasNoLiveContent =
    !isSet(goalsQuery.data) && !isSet(bodyQuery.data) && !isSet(healthQuery.data);
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);
  const showOfflineSnapshot = !online && hasNoLiveContent && offlineEntry !== null;

  return { offlineEntry, showOfflineSnapshot };
}
