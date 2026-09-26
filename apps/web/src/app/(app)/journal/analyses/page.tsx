import { Suspense } from 'react';
import { JournalAnalysesScreen } from '@/components/journal/analyses/journal-analyses-screen';
import { MobileDrillDownHeader } from '@/components/layout/header/mobile-drill-down-header';
import { Skeleton } from '@/components/ui/skeleton';
import type { JournalAnalysesPayload } from '@sharpit/app/lib/web/payloads';
import { cachedServerApiJson } from '@/server/api-client';

function JournalAnalysesSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="rounded-analysis-lg h-44 w-full border-0" />
      <Skeleton className="rounded-analysis h-72 w-full border-0" />
    </div>
  );
}

/** Athlete-scoped reads live under Suspense so the shell prerenders (Cache Components). */
async function JournalAnalysesWithData() {
  const payload = await cachedServerApiJson<JournalAnalysesPayload>('/api/web/journal-analyses');
  if (!payload) {
    throw new Error('api. has no journal analyses for this session');
  }
  return <JournalAnalysesScreen {...payload} />;
}

export default function JournalAnalysesPage() {
  return (
    <div className="space-y-8">
      <MobileDrillDownHeader backHref="/journal" backLabel="Journal" title="Analyses" />
      <Suspense fallback={<JournalAnalysesSkeleton />}>
        <JournalAnalysesWithData />
      </Suspense>
    </div>
  );
}
