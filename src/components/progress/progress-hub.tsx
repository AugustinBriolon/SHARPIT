'use client';

import { format } from 'date-fns';
import { Medal, Scale, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CompositionView } from '@/components/corps/composition/composition-view';
import { GoalsView } from '@/components/goals/goals-view';
import { useGoals } from '@/hooks/use-data';
import { CalibrationSection } from '@/components/progress/calibration-section';
import { Skeleton } from '@/components/ui/skeleton';
import { StickyHeader } from '@/components/layout/sticky-header';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { PhysicalHealthHubView } from '@/components/physical-health/physical-health-hub-view';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import {
  useBodyPresentationViewModel,
  usePhysicalHealthViewModel,
} from '@/hooks/use-presentation-view-model';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { navPillClass } from '@/lib/ui/nav-pill';

const RecordsPanel = dynamic(
  () => import('@/components/analytics/records/records-panel').then((mod) => mod.RecordsPanel),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

/**
 * Progress is grouped by the question each section answers, not by the domain
 * the data came from (ADR-022).
 *
 * This is why records and body composition part company: both were readings of
 * the body, but one says what the athlete produced and the other says what the
 * athlete is made of. Calibration joins performance for the same reason — a
 * threshold is the yardstick the performance is read against, not a preference.
 */
const TABS = [
  {
    id: 'goals',
    label: 'Objectifs',
    description: 'Ce vers quoi tu construis — courses, échéances et repères.',
    icon: Target,
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Records, courbes de référence et seuils qui servent à les lire.',
    icon: Medal,
  },
  {
    id: 'body',
    label: 'Corps & santé',
    description: 'Composition, douleurs et points de vigilance.',
    icon: Scale,
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

function BodyTabBody() {
  return (
    <div className="space-y-6">
      <CompositionView embedded />
      <PhysicalHealthHubView />
    </div>
  );
}

function PerformanceTabBody() {
  return (
    <div className="space-y-6">
      <RecordsPanel />
      <CalibrationSection />
      <Link
        className="text-muted-foreground hover:text-foreground inline-block text-sm underline underline-offset-2"
        href="/training/history"
      >
        Voir l’historique complet des activités
      </Link>
    </div>
  );
}

export function ProgressHub({ basePath = '/progress' }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: TabId = isTabId(raw) ? raw : 'goals';
  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  // Gated at the hub, not per section: an offline athlete opening Progression
  // lands on Objectifs, and the snapshot is the only athlete state there is —
  // it must not be reachable solely by knowing to switch tabs first.
  const online = useOnlineStatus();
  const { date } = useTodaySelectedDate();
  const trainingDayId = format(date, 'yyyy-MM-dd');
  const goalsQuery = useGoals();
  const bodyQuery = useBodyPresentationViewModel();
  const healthQuery = usePhysicalHealthViewModel(trainingDayId);
  const hasNoLiveContent =
    goalsQuery.data == null && bodyQuery.data == null && healthQuery.data == null;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveContent);
  const showOfflineSnapshot = !online && hasNoLiveContent && offlineEntry != null;

  function setTab(next: string) {
    router.replace(`${basePath}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-label">Progression</p>
        <h1 className="text-page-title mt-1">{activeTab.label}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{activeTab.description}</p>

        <nav
          aria-label="Sections Progression"
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
        {showOfflineSnapshot ? (
          <OfflineSnapshotSummary entry={offlineEntry} />
        ) : (
          <>
            {tab === 'goals' && <GoalsView embedded />}
            {tab === 'performance' && <PerformanceTabBody />}
            {tab === 'body' && <BodyTabBody />}
          </>
        )}
      </div>
    </div>
  );
}
