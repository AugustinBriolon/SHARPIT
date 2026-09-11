import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  getDismissedSessionLinkIdsSnapshot,
  subscribeSessionLinkDismissals,
} from '@/lib/today/rich/session-link-dismissals';
import {
  getDemoSessionLinksSnapshot,
  subscribeDemoSessionLinks,
} from '@/lib/demo/demo-session-link-state';
import {
  activityStatusReminderFact,
  emptyActivityStatusStore,
  getActivityStatusStoreServerSnapshot,
  getActivityStatusStoreSnapshot,
  hydrateActivityStatusFromServer,
  subscribeActivityStatus,
  type ActivityStatusStore,
} from '@/lib/health/activity-status';
import {
  deriveLinkContext,
  derivePostSessionLoop,
  deriveReminders,
  deriveSessionLines,
  parseDemoLinksSnapshot,
  parseDismissedLinkIds,
} from '@/components/today/rich/today-action-row-derived-helpers';

export function useTodayActionRowDerived(vm: TodayViewModel, loading: boolean) {
  useEffect(() => {
    void hydrateActivityStatusFromServer();
  }, []);

  const dismissedSnapshot = useSyncExternalStore(
    subscribeSessionLinkDismissals,
    getDismissedSessionLinkIdsSnapshot,
    () => '',
  );
  const demoLinksSnapshot = useSyncExternalStore(
    subscribeDemoSessionLinks,
    getDemoSessionLinksSnapshot,
    () => '',
  );
  const activityStatusSnapshot = useSyncExternalStore(
    subscribeActivityStatus,
    getActivityStatusStoreSnapshot,
    getActivityStatusStoreServerSnapshot,
  );
  const activityStore = useMemo((): ActivityStatusStore => {
    try {
      return JSON.parse(activityStatusSnapshot) as ActivityStatusStore;
    } catch {
      return emptyActivityStatusStore();
    }
  }, [activityStatusSnapshot]);

  const dismissedLinkIds = useMemo(
    () => parseDismissedLinkIds(dismissedSnapshot),
    [dismissedSnapshot],
  );

  const demoLinks = useMemo(() => parseDemoLinksSnapshot(demoLinksSnapshot), [demoLinksSnapshot]);

  const { pendingLinkSuggestions, sessionLinkSuggestions, linkExclusions } = useMemo(
    () => deriveLinkContext(vm, dismissedLinkIds, demoLinks),
    [vm, dismissedLinkIds, demoLinks],
  );

  const { orientation, sessionLines, primaryIndex } = useMemo(
    () => deriveSessionLines(vm, loading, linkExclusions),
    [vm, loading, linkExclusions],
  );

  const postSessionLoop = useMemo(
    () => derivePostSessionLoop(vm, pendingLinkSuggestions, linkExclusions, sessionLines),
    [vm, pendingLinkSuggestions, linkExclusions, sessionLines],
  );

  const reminders = useMemo(() => {
    const base = deriveReminders(vm, loading);
    if (loading) {
      return base;
    }
    const modeFact = activityStatusReminderFact(activityStore.status, activityStore.retention);
    return modeFact ? [modeFact, ...base] : base;
  }, [vm, loading, activityStore]);

  return {
    orientation,
    sessionLinkSuggestions,
    sessionLines,
    primaryIndex,
    postSessionLoop,
    rearrangeProposal: loading ? null : (vm.rearrangeProposal ?? null),
    daySummaryEmpty: !loading && sessionLines.length === 0 && sessionLinkSuggestions.length === 0,
    reminders,
  };
}
