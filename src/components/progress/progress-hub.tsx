'use client';

import { format } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoalsToolbar } from '@/components/goals/cards/goal-cards';
import { ProgressHubContent } from '@/components/progress/progress-hub-content';
import { ProgressHubNav } from '@/components/progress/progress-hub-nav';
import { isSectionId } from '@/components/progress/progress-hub-sections';
import { useProgressHubOffline } from '@/components/progress/use-progress-hub-offline';
import { StickyHeader } from '@/components/layout/sticky-header';

export function ProgressHub({ basePath = '/progress' }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const section = isSectionId(raw) ? raw : 'goals';
  const { offlineEntry, showOfflineSnapshot } = useProgressHubOffline();

  function setSection(next: string) {
    router.replace(`${basePath}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <StickyHeader>
        <div className="flex min-h-11 items-start justify-between gap-4 lg:min-h-9">
          <h1 className="text-page-title">Progression</h1>
          {section === 'goals' && <GoalsToolbar />}
        </div>
        <ProgressHubNav section={section} onSelect={setSection} />
      </StickyHeader>

      <div className="space-y-4">
        <ProgressHubContent
          offlineEntry={offlineEntry}
          section={section}
          showOfflineSnapshot={showOfflineSnapshot}
        />
      </div>
    </div>
  );
}
