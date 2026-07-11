'use client';

import { CalendarView } from '@/components/calendar/calendar-view';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { MacroPlanDialog } from '@/components/planning/macro-plan-dialog';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { PlanningView } from '@/components/planning/planning-view';
import {
  SessionsCoachMenu,
  type SessionsCoachAction,
} from '@/components/sessions/sessions-coach-menu';
import { TrainingList } from '@/components/training/training-list';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoals } from '@/hooks/use-data';
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

function isCoachOverlay(value: string | null): value is 'generate' | 'adapt' | 'macro' {
  return value === 'generate' || value === 'adapt' || value === 'macro';
}

export function SessionsHubSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-52" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

export function SessionsHub({
  basePath = '/seances',
  sectionLabel = 'Séances',
  title = 'Historique & planning',
}: {
  basePath?: string;
  sectionLabel?: string;
  title?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: goals = [] } = useGoals();
  const raw = searchParams.get('tab');
  const tab: TabId = isTabId(raw) ? raw : 'calendrier';
  const createFromUrl = searchParams.has('create');
  const coachOverlay = searchParams.get('coach');
  const coachAction = isCoachOverlay(coachOverlay) ? coachOverlay : null;

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  function setTab(next: string) {
    replaceParams((params) => {
      params.set('tab', next);
    });
  }

  function closeOverlays() {
    replaceParams((params) => {
      params.delete('create');
      params.delete('coach');
    });
  }

  function handleCoachAction(action: SessionsCoachAction) {
    switch (action) {
      case 'plan':
        replaceParams((params) => {
          params.set('create', '1');
        });
        break;
      case 'manual':
        router.push('/training/manual');
        break;
      case 'generate':
        replaceParams((params) => {
          params.set('coach', 'generate');
        });
        break;
      case 'adapt':
        replaceParams((params) => {
          params.set('coach', 'adapt');
        });
        break;
      case 'macro':
        replaceParams((params) => {
          params.set('coach', 'macro');
        });
        break;
    }
  }

  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <div className="flex items-end justify-between lg:gap-4">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              {sectionLabel}
            </p>
            <h1 className="font-heading mt-1 text-2xl font-semibold">{title}</h1>
          </div>
          <SessionsCoachMenu onAction={handleCoachAction} />
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

      {createFromUrl && (
        <PlannedSessionDialog defaultDate={new Date()} goals={goals} onClose={closeOverlays} />
      )}

      {coachAction === 'generate' && <PlanGenerator onClose={closeOverlays} />}
      {coachAction === 'adapt' && <PlanAdapter onClose={closeOverlays} />}
      {coachAction === 'macro' && <MacroPlanDialog goals={goals} onClose={closeOverlays} />}
    </div>
  );
}
