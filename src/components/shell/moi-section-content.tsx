'use client';

import { GoalsToolbar } from '@/components/goals/cards/goal-cards';
import { GoalsCapView } from '@/components/goals/cap/goals-cap-view';
import { BodySection, PerformanceSection } from '@/components/progress/progress-hub-sections';
import { useProgressHubOffline } from '@/components/progress/use-progress-hub-offline';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';

export type MoiSectionId = 'corps' | 'objectifs' | 'performance';

/**
 * Dedicated Moi child content — one section per page (no tabbed fourre-tout).
 * Offline snapshot gate reused from the former Progress hub.
 */
export function MoiSectionContent({ section }: { section: MoiSectionId }) {
  const { offlineEntry, showOfflineSnapshot } = useProgressHubOffline();

  if (showOfflineSnapshot && offlineEntry) {
    return <OfflineSnapshotSummary entry={offlineEntry} />;
  }

  if (section === 'objectifs') {
    return (
      <div className="space-y-6">
        <GoalsCapView />
      </div>
    );
  }

  if (section === 'performance') {
    return <PerformanceSection />;
  }

  return <BodySection />;
}

/** Toolbar for Objectifs sticky header (goals create actions). */
export function MoiObjectifsToolbar() {
  return <GoalsToolbar />;
}
