'use client';

import { Activity, Medal, SlidersHorizontal } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { CorpsPanel, CorpsSectionHeader } from '@/components/corps/corps-ui';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProfileData } from '@/components/settings/profile';
import { navPillClass } from '@/lib/ui/nav-pill';
import {
  PROGRESSION_BASE_PATH,
  PROGRESSION_TABS,
  isProgressionTabId,
  type ProgressionTabId,
} from '@/lib/training/progression-tabs';

const TAB_ICON: Record<ProgressionTabId, typeof Activity> = {
  etat: Activity,
  records: Medal,
  calibration: SlidersHorizontal,
};

const AnalyticsClient = dynamic(
  () => import('@/components/analytics/analytics-client').then((mod) => mod.AnalyticsClient),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);
const RecordsPanel = dynamic(
  () => import('@/components/analytics/records/records-panel').then((mod) => mod.RecordsPanel),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);
const PerformanceCalibrationPanel = dynamic(
  () =>
    import('@/components/settings/profile/performance-calibration-panel').then(
      (mod) => mod.PerformanceCalibrationPanel,
    ),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

export function ProgressionHub({
  initialProfile,
  basePath = PROGRESSION_BASE_PATH,
}: {
  initialProfile: ProfileData | null;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: ProgressionTabId = isProgressionTabId(raw) ? raw : 'etat';
  const activeTab = PROGRESSION_TABS.find((item) => item.id === tab) ?? PROGRESSION_TABS[0];

  function setTab(next: string) {
    router.replace(`${basePath}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <MobileBackLink showOnDesktop />
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Progression</h1>
        <p className="text-muted-foreground mt-1 text-sm">{activeTab.description}</p>

        <nav
          aria-label="Sections Progression"
          className="-mx-1 mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
        >
          {PROGRESSION_TABS.map((item) => {
            const Icon = TAB_ICON[item.id];
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                aria-current={active ? 'page' : undefined}
                className={navPillClass(active)}
                type="button"
                onClick={() => setTab(item.id)}
              >
                <Icon className="size-3.5" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
      </StickyHeader>

      <div className="space-y-4">
        {tab === 'etat' && <AnalyticsClient />}
        {tab === 'records' && <RecordsPanel />}
        {tab === 'calibration' && (
          <CorpsPanel className="space-y-4 py-4">
            <CorpsSectionHeader
              description="Repères utilisés pour lire l’intensité, la charge et les écarts à ton niveau réel."
              label="Calibration"
              title="Seuils & repères"
            />
            <PerformanceCalibrationPanel initial={initialProfile} />
          </CorpsPanel>
        )}
      </div>
    </div>
  );
}
