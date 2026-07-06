'use client';

import { Activity, BarChart3, HeartPulse, Scale } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { RecordsPanel } from '@/components/analytics/records-panel';
import { CompositionView } from '@/components/corps/composition-view';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PhysicalView } from '@/components/physical/physical-view';
import { RecoveryView } from '@/components/recovery/recovery-view';
import { navPillClass } from '@/lib/nav-pill';

const TABS = [
  {
    id: 'recuperation',
    label: 'Récupération',
    description: 'Readiness, VFC, sommeil et tendances santé.',
    icon: HeartPulse,
  },
  {
    id: 'composition',
    label: 'Composition',
    description: 'Poids, masse grasse et tendances impédancemétrie.',
    icon: Scale,
  },
  {
    id: 'suivi',
    label: 'Suivi physique',
    description: 'Douleurs, blessures et points de vigilance.',
    icon: Activity,
  },
  {
    id: 'stats',
    label: 'Statistiques',
    description: "Charge, volume et records d'entraînement.",
    icon: BarChart3,
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function CorpsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: TabId = isTabId(raw) ? raw : 'recuperation';
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  function setTab(next: string) {
    router.replace(`/corps?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Mon corps
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Forme & bien-être</h1>
        <p className="text-muted-foreground mt-1 text-sm">{activeTab.description}</p>

        <nav
          aria-label="Sections Mon corps"
          className="-mx-1 mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                aria-current={active ? 'page' : undefined}
                className={navPillClass(active)}
                type="button"
                onClick={() => setTab(t.id)}
              >
                <Icon className="size-3.5" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </nav>
      </StickyHeader>

      <div className="space-y-4">
        {tab === 'recuperation' && <RecoveryView />}
        {tab === 'composition' && <CompositionView embedded />}
        {tab === 'suivi' && <PhysicalView embedded />}
        {tab === 'stats' && (
          <div className="space-y-6">
            <AnalyticsClient />
            <RecordsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
