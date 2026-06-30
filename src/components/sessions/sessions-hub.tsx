'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarView } from '@/components/calendar/calendar-view';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanningView } from '@/components/planning/planning-view';
import { TrainingList } from '@/components/training/training-list';
import { LinkButton } from '@/components/ui/link-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { id: 'calendrier', label: 'Calendrier' },
  { id: 'activites', label: 'Activités' },
  { id: 'planning', label: 'Planning' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function SessionsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: TabId = isTabId(raw) ? raw : 'calendrier';

  function setTab(next: string) {
    router.replace(`/seances?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Séances</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
            Historique & planning
          </h1>
          <p className="text-muted-foreground mt-1">
            Tes activités, le calendrier et le plan d&apos;entraînement au même endroit.
          </p>
        </div>
        <LinkButton href="/training/new">Nouvelle séance</LinkButton>
      </StickyHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent className="mt-6" value="activites">
          <TrainingList />
        </TabsContent>
        <TabsContent className="mt-6" value="calendrier">
          <CalendarView embedded />
        </TabsContent>
        <TabsContent className="mt-6" value="planning">
          <PlanningView embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
