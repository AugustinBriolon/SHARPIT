'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CompositionView } from '@/components/corps/composition/composition-view';
import { GoalsView } from '@/components/goals/goals-view';
import { GoalsToolbar } from '@/components/goals/cards/goal-cards';
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
import { cn } from '@/lib/utils';

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
const SECTIONS = [
  {
    id: 'goals',
    label: 'Objectifs',
  },
  {
    id: 'performance',
    label: 'Performance',
  },
  {
    id: 'body',
    label: 'Corps & santé',
  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function isSectionId(value: string | null): value is SectionId {
  return SECTIONS.some((section) => section.id === value);
}

function BodySection() {
  return (
    <div className="space-y-6">
      <CompositionView embedded />
      <PhysicalHealthHubView />
    </div>
  );
}

function PerformanceSection() {
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
  const section: SectionId = isSectionId(raw) ? raw : 'goals';

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

  function setSection(next: string) {
    router.replace(`${basePath}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <StickyHeader>
        {/* `min-h` matches the default Button size so the header holds its
            height whether or not the toolbar is mounted — otherwise it
            shrank on every switch away from "Objectifs". */}
        <div className="flex min-h-11 items-start justify-between gap-4 lg:min-h-9">
          <h1 className="text-page-title">Progression</h1>
          {section === 'goals' ? <GoalsToolbar /> : null}
        </div>

        <nav
          aria-label="Sections Progression"
          className="border-analysis-border/70 mt-4 flex gap-5 border-b"
        >
          {SECTIONS.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                type="button"
                className={cn(
                  'pressable -mb-px min-h-11 border-b-2 px-0 text-sm lg:min-h-9',
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
                onClick={() => setSection(item.id)}
              >
                {item.label}
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
            {section === 'goals' && <GoalsView embedded />}
            {section === 'performance' && <PerformanceSection />}
            {section === 'body' && <BodySection />}
          </>
        )}
      </div>
    </div>
  );
}
