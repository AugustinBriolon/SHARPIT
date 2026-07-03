'use client';

import { CalendarView } from '@/components/calendar/calendar-view';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanningView } from '@/components/planning/planning-view';
import { TrainingList } from '@/components/training/training-list';
import { LinkButton } from '@/components/ui/link-button';
import { navPillClass } from '@/lib/nav-pill';
import { CalendarRange, ClipboardList, List } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const TABS = [
  {
    id: 'calendrier',
    label: 'Calendrier',
    description: 'Vue mensuelle, séances planifiées et événements Google.',
    icon: CalendarRange,
  },
  {
    id: 'activites',
    label: 'Activités',
    description: 'Historique de tes séances enregistrées, du plus récent au plus ancien.',
    icon: List,
  },
  {
    id: 'planning',
    label: 'Planning',
    description: 'Semaine type, charge cible et ajustements du coach.',
    icon: ClipboardList,
  },
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
    <div className="space-y-4">
      <StickyHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              Séances
            </p>
            <h1 className="font-heading mt-1 text-2xl font-semibold">Historique & planning</h1>
          </div>
          <LinkButton className="shrink-0" href="/training/new">
            Nouvelle séance
          </LinkButton>
        </div>

        <nav
          aria-label="Sections Séances"
          className="mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
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
        {tab === 'calendrier' && <CalendarView embedded />}
        {tab === 'activites' && <TrainingList />}
        {tab === 'planning' && <PlanningView embedded />}
      </div>
    </div>
  );
}
