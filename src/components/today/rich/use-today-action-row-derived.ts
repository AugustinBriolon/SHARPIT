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
import { hydrateActivityStatusFromServer } from '@/lib/health/activity-status';
import { useAdaptAppliedSettled } from '@/hooks/use-adapt-applied-settled';
import {
  deriveLinkContext,
  derivePostSessionLoop,
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

  const { adaptAck, settled } = useAdaptAppliedSettled();

  return {
    orientation,
    sessionLinkSuggestions,
    sessionLines,
    primaryIndex,
    postSessionLoop,
    rearrangeProposal: loading || settled ? null : (vm.rearrangeProposal ?? null),
    adaptAppliedAck: !loading && settled ? adaptAck : null,
    daySummaryEmpty: !loading && sessionLines.length === 0 && sessionLinkSuggestions.length === 0,
  };
}
