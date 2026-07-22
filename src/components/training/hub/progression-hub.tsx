'use client';

import { Activity, Medal, SlidersHorizontal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { RecordsPanel } from '@/components/analytics/records/records-panel';
import { CorpsPanel, CorpsSectionHeader } from '@/components/corps/corps-ui';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PerformanceCalibrationPanel, type ProfileData } from '@/components/settings/profile';
import { navPillClass } from '@/lib/ui/nav-pill';

const TABS = [
  {
    id: 'etat',
    label: 'État',
    description: 'Où tu en es maintenant — forme, charge, fraîcheur et projection.',
    icon: Activity,
  },
  {
    id: 'records',
    label: 'Records',
    description: 'Tes meilleures performances observées et courbes de référence.',
    icon: Medal,
  },
  {
    id: 'calibration',
    label: 'Calibration',
    description: 'Les repères utilisés par SHARPIT pour interpréter tes efforts.',
    icon: SlidersHorizontal,
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function ProgressionHub({
  initialProfile,
  basePath = '/training/progression',
}: {
  initialProfile: ProfileData | null;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: TabId = isTabId(raw) ? raw : 'etat';
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];

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
          {TABS.map((item) => {
            const Icon = item.icon;
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
