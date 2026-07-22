'use client';

import { CalendarView } from '@/components/calendar/calendar-view';
import { PlanAdapter } from '@/components/coach/plan/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan/plan-generator';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { MacroPlanDialog } from '@/components/planning/macro-plan-dialog';
import { PlannedSessionDialog } from '@/components/planning/session/planned-session-dialog';
import { PlanningView } from '@/components/planning/planning-view';
import {
  SessionsCoachMenu,
  type SessionsCoachAction,
} from '@/components/sessions/sessions-coach-menu';
import { TrainingList } from '@/components/training/hub/training-list';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonPill,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';
import { useGoals } from '@/hooks/use-data';
import { navPillClass } from '@/lib/ui/nav-pill';
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
          <SkeletonEyebrow className="w-16" />
          <SkeletonTitle className="h-8 w-56 max-w-full" size="md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPill key={i} className="h-9 w-28 shrink-0" />
        ))}
      </div>
      <SkeletonCard className="min-h-96 p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="rounded-analysis min-h-20 border-0" />
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function SessionsHub({
  basePath = '/training/sessions',
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
            <p className="text-label">{sectionLabel}</p>
            <h1 className="text-page-title mt-1">{title}</h1>
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
