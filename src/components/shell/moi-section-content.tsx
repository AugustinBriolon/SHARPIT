'use client';

import Link from 'next/link';
import { GoalsToolbar } from '@/components/goals/cards/goal-cards';
import { GoalsView } from '@/components/goals/goals-view';
import { BodySection, PerformanceSection } from '@/components/progress/progress-hub-sections';
import { useProgressHubOffline } from '@/components/progress/use-progress-hub-offline';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { MOI_PERFORMANCE_PATH } from '@/lib/moi/paths';

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
        <GoalsView embedded />
        <nav aria-label="Suite objectifs" className="pt-1">
          <Link
            className="text-muted-foreground hover:text-foreground inline-block text-sm underline underline-offset-2"
            href={MOI_PERFORMANCE_PATH}
          >
            Records &amp; seuils
          </Link>
        </nav>
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
