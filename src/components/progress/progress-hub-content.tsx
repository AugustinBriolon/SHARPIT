'use client';

import type { SectionId } from '@/components/progress/progress-hub-sections';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { GoalsView } from '@/components/goals/goals-view';
import { BodySection, PerformanceSection } from '@/components/progress/progress-hub-sections';
import type { PersistedSnapshotEntry } from '@/lib/pwa/snapshot-store-validation';

export function ProgressHubContent({
  section,
  showOfflineSnapshot,
  offlineEntry,
}: {
  section: SectionId;
  showOfflineSnapshot: boolean;
  offlineEntry: PersistedSnapshotEntry | null;
}) {
  if (showOfflineSnapshot && offlineEntry) {
    return <OfflineSnapshotSummary entry={offlineEntry} />;
  }

  if (section === 'goals') {
    return <GoalsView embedded />;
  }
  if (section === 'performance') {
    return <PerformanceSection />;
  }
  return <BodySection />;
}
