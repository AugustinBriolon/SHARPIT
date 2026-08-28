import { useMemo, useSyncExternalStore } from 'react';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  getDismissedSessionLinkIdsSnapshot,
  subscribeSessionLinkDismissals,
} from '@/lib/today/session-link-dismissals';
import {
  getDemoSessionLinksSnapshot,
  subscribeDemoSessionLinks,
} from '@/lib/demo/demo-session-link-state';
import {
  deriveLinkContext,
  derivePostSessionLoop,
  deriveReminders,
  deriveSessionLines,
  parseDemoLinksSnapshot,
  parseDismissedLinkIds,
} from '@/components/today/rich/today-action-row-derived-helpers';

export function useTodayActionRowDerived(vm: TodayViewModel, loading: boolean) {
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
    () => derivePostSessionLoop(vm, pendingLinkSuggestions, linkExclusions),
    [vm, pendingLinkSuggestions, linkExclusions],
  );

  const daySummaryEmpty =
    !loading && sessionLines.length === 0 && sessionLinkSuggestions.length === 0;

  const reminders = useMemo(() => deriveReminders(vm, loading), [vm, loading]);

  return {
    orientation,
    sessionLinkSuggestions,
    sessionLines,
    primaryIndex,
    postSessionLoop,
    daySummaryEmpty,
    reminders,
  };
}
