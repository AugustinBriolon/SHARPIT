import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { TodayViewModel } from '@sharpit/app/presentation/today-view-model';
import {
  getDismissedSessionLinkIdsSnapshot,
  subscribeSessionLinkDismissals,
} from '@sharpit/app/lib/today/rich/session-link-dismissals';
import {
  getDemoSessionLinksSnapshot,
  subscribeDemoSessionLinks,
} from '@sharpit/app/lib/demo/demo-session-link-state';
import { hydrateActivityStatusFromServer } from '@sharpit/app/lib/health/activity-status';
import {
  deriveLinkContext,
  derivePostSessionLoop,
  deriveSessionLines,
  parseDemoLinksSnapshot,
  parseDismissedLinkIds,
} from '@/components/today/rich/today-action-row-derived-helpers';

/**
 * Plan vivant state is deliberately absent: the slot owns it, so the widget can
 * mount outside « Actions du jour » without this hook forwarding it.
 */
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

  return {
    orientation,
    sessionLinkSuggestions,
    sessionLines,
    primaryIndex,
    postSessionLoop,
    daySummaryEmpty: !loading && sessionLines.length === 0 && sessionLinkSuggestions.length === 0,
  };
}
