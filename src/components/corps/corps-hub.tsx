'use client';

import { Activity, Scale } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompositionView } from '@/components/corps/composition-view';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PhysicalHealthHubView } from '@/components/physical-health/physical-health-hub-view';
import { navPillClass } from '@/lib/nav-pill';

const TABS = [
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
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function CorpsHub({ basePath = '/corps' }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: TabId = isTabId(raw) ? raw : 'composition';
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  function setTab(next: string) {
    router.replace(`${basePath}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-label">Mon corps</p>
        <h1 className="text-page-title mt-1">Forme & bien-être</h1>
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
        {tab === 'composition' && <CompositionView embedded />}
        {tab === 'suivi' && <PhysicalHealthHubView />}
      </div>
    </div>
  );
}
