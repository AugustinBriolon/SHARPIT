import type { TodayViewModel } from '@/core/presentation/today-view-model';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

export type TodayDashboardView =
  | { kind: 'offline'; entry: PersistedSnapshotEntry }
  | { kind: 'empty'; vm: TodayViewModel | null }
  | { kind: 'loading-shell' }
  | { kind: 'main'; vm: TodayViewModel };

function isTodayDashboardEmpty(vm: TodayViewModel | null) {
  return !vm || Boolean(vm.emptyState);
}

export function resolveTodayDashboardView({
  valuesLoading,
  vm,
  online,
  offlineEntry,
}: {
  valuesLoading: boolean;
  vm: TodayViewModel | null;
  online: boolean;
  offlineEntry: PersistedSnapshotEntry | null;
}): TodayDashboardView {
  if (!valuesLoading && isTodayDashboardEmpty(vm)) {
    if (!online && offlineEntry) {
      return { kind: 'offline', entry: offlineEntry };
    }
    return { kind: 'empty', vm };
  }

  if (valuesLoading && !vm) {
    return { kind: 'loading-shell' };
  }

  if (vm) {
    return { kind: 'main', vm };
  }

  return { kind: 'loading-shell' };
}
