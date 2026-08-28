import type { TodayViewModel } from '@/core/presentation/today-view-model';
import {
  filterDaySummaryForLinkExclusions,
  idsExcludedByLinkSuggestions,
  mergeLinkExclusions,
} from '@/lib/today/session-link-suggestions';

type LinkExclusions = { activityIds: Set<string>; plannedSessionIds: Set<string> };
import { filterDismissedSessionLinkSuggestions } from '@/lib/today/session-link-dismissals';
import {
  filterDemoLinkedSessionSuggestions,
  readDemoSessionLinks,
} from '@/lib/demo/demo-session-link-state';

export type DemoSessionLink = { plannedSessionId: string; activityId: string };

export function parseDemoLinksSnapshot(snapshot: string): DemoSessionLink[] {
  if (!snapshot) {
    return readDemoSessionLinks();
  }
  return snapshot
    .split('\n')
    .map((line) => {
      const [plannedSessionId, activityId] = line.split('\0');
      return { plannedSessionId, activityId };
    })
    .filter((entry): entry is DemoSessionLink =>
      Boolean(entry.plannedSessionId && entry.activityId),
    );
}

export function parseDismissedLinkIds(snapshot: string): Set<string> {
  return new Set(snapshot ? snapshot.split('\0') : []);
}

export function deriveLinkContext(
  vm: TodayViewModel,
  dismissedLinkIds: Set<string>,
  demoLinks: DemoSessionLink[],
) {
  const pendingLinkSuggestions = filterDismissedSessionLinkSuggestions(
    vm.actionRow.sessionLinkSuggestions,
    dismissedLinkIds,
  );

  const sessionLinkSuggestions = filterDemoLinkedSessionSuggestions(
    pendingLinkSuggestions,
    new Set(demoLinks.map((entry) => entry.plannedSessionId)),
  );

  const linkExclusions = mergeLinkExclusions(idsExcludedByLinkSuggestions(pendingLinkSuggestions), {
    activityIds: new Set(demoLinks.map((entry) => entry.activityId)),
    plannedSessionIds: new Set(demoLinks.map((entry) => entry.plannedSessionId)),
  });

  return { pendingLinkSuggestions, sessionLinkSuggestions, linkExclusions };
}

export function deriveSessionLines(
  vm: TodayViewModel,
  loading: boolean,
  linkExclusions: LinkExclusions,
) {
  const orientation = loading ? null : vm.morningOrientation;
  const proposalSessionId = morningProposalSessionId(orientation);
  const baseSessionLines = filterProposalSessionLines(vm, proposalSessionId);
  const sessionLines = filterDaySummaryForLinkExclusions(baseSessionLines, linkExclusions);
  const primaryIndex = sessionLines.findIndex((line) => line.kind === 'planned' && !line.isDone);

  return { orientation, sessionLines, primaryIndex };
}

function morningProposalSessionId(
  orientation: TodayViewModel['morningOrientation'],
): string | null {
  if (!orientation) {
    return null;
  }
  return orientation.confirmEase?.sessionId ?? orientation.confirmIncrease?.sessionId ?? null;
}

function filterProposalSessionLines(vm: TodayViewModel, proposalSessionId: string | null) {
  if (!proposalSessionId) {
    return vm.actionRow.daySummaryLines;
  }
  return vm.actionRow.daySummaryLines.filter((line) => line.id !== proposalSessionId);
}

export function derivePostSessionLoop(
  vm: TodayViewModel,
  pendingLinkSuggestions: TodayViewModel['actionRow']['sessionLinkSuggestions'],
  linkExclusions: LinkExclusions,
) {
  if (
    !vm.postSessionLoop?.visible ||
    pendingLinkSuggestions.length > 0 ||
    linkExclusions.activityIds.has(vm.postSessionLoop.activityId)
  ) {
    return null;
  }
  return vm.postSessionLoop;
}

export function deriveReminders(vm: TodayViewModel, loading: boolean) {
  if (
    loading ||
    vm.hero.twinTrustStrip.limitingCauseText ||
    vm.actionRow.limitingMode !== 'facts' ||
    vm.actionRow.limitingFacts.length === 0
  ) {
    return [];
  }
  return vm.actionRow.limitingFacts;
}
