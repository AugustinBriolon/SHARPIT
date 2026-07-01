'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AnalyticsClient } from '@/components/analytics/analytics-client';
import { RecordsPanel } from '@/components/analytics/records-panel';
import { CompositionView } from '@/components/corps/composition-view';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PhysicalView } from '@/components/physical/physical-view';
import { RecoveryView } from '@/components/recovery/recovery-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { id: 'recuperation', label: 'Récupération' },
  { id: 'composition', label: 'Composition' },
  { id: 'suivi', label: 'Suivi physique' },
  { id: 'stats', label: 'Statistiques' },
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

  function setTab(next: string) {
    router.replace(`/corps?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Mon corps</p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
          Forme & bien-être
        </h1>
        <p className="text-muted-foreground mt-1">
          Readiness, tendances santé, blessures et statistiques d&apos;entraînement.
        </p>
      </StickyHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent className="mt-6" value="recuperation">
          <RecoveryView embedded />
        </TabsContent>
        <TabsContent className="mt-6" value="composition">
          <CompositionView embedded />
        </TabsContent>
        <TabsContent className="mt-6" value="suivi">
          <PhysicalView embedded />
        </TabsContent>
        <TabsContent className="mt-6 space-y-8" value="stats">
          <AnalyticsClient />
          <RecordsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
