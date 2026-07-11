'use client';

import { AnalyticsSection, RecordsSectionHeader } from '@/components/analytics/analytics-cards';
import { PerformancePredictions } from '@/components/analytics/performance-predictions';
import { PowerCurveChart } from '@/components/analytics/power-curve-chart';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonPill,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';
import { useRecords } from '@/hooks/use-data';
import { navPillClass } from '@/lib/nav-pill';
import {
  recordCategoryAnchorId,
  recordSportTabFromCategory,
  type RecordCategory,
  type RecordEntry,
} from '@/lib/records';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, format, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bike, Footprints, Waves } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type SportTab = 'run' | 'bike' | 'swim';

const TABS: {
  id: SportTab;
  label: string;
  icon: typeof Footprints;
  code: string;
}[] = [
  { id: 'run', label: 'Course', icon: Footprints, code: 'CO' },
  { id: 'bike', label: 'Vélo', icon: Bike, code: 'VE' },
  { id: 'swim', label: 'Natation', icon: Waves, code: 'NA' },
];

function isRecent(dateIso: string): boolean {
  return differenceInCalendarDays(new Date(), new Date(dateIso)) <= 14;
}

function entryMeta(entry: RecordEntry): string {
  const date = format(new Date(entry.date), 'd MMM yyyy', { locale: fr });
  return entry.sublabel ? `${entry.sublabel} · ${date}` : date;
}

function recordNarrative(entry: RecordEntry): string {
  const daysSince = differenceInCalendarDays(new Date(), new Date(entry.date));
  if (daysSince <= 120) {
    return `il y a ${formatDistanceToNowStrict(new Date(entry.date), { locale: fr })}`;
  }
  if (daysSince <= 365) return 'record de la saison';
  return `il y a ${formatDistanceToNowStrict(new Date(entry.date), { locale: fr })}`;
}

function RecordCategoryCard({ category }: { category: RecordCategory }) {
  const [best] = category.entries;

  return (
    <div
      className="analysis-panel rounded-analysis-lg scroll-mt-24 p-4"
      id={recordCategoryAnchorId(category.key)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-label">{category.label}</p>
        {best && isRecent(best.date) && (
          <Badge className="border-primary/30 text-primary" variant="outline">
            Nouveau
          </Badge>
        )}
      </div>

      {best ? (
        <>
          <RecordValue entry={best} />
          {category.entries.length > 1 && (
            <div className="border-analysis-border mt-3 space-y-0.5 border-t pt-2">
              {category.entries.slice(1).map((entry) => (
                <RecordRow key={entry.rank} entry={entry} compact />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-data text-muted-foreground/50 mt-3 text-2xl font-semibold">—</p>
      )}
    </div>
  );
}

function RecordValue({ entry }: { entry: RecordEntry }) {
  const inner = (
    <div
      className="rounded-analysis bg-analysis-surface-alt/80 mt-3 px-3 py-3"
      style={{ boxShadow: 'inset 3px 0 0 var(--color-chart-5)' }}
    >
      {/* Records are the one deliberate exception: each #1 uses the rare warm accent as an achievement cue. */}
      <p className="text-data mt-1 text-3xl font-semibold text-(--color-chart-5)">
        {entry.displayValue}
      </p>
      <p className="text-data text-muted-foreground mt-1 text-xs">{entryMeta(entry)}</p>
      <p className="text-muted-foreground mt-1 text-[11px]">{recordNarrative(entry)}</p>
    </div>
  );

  if (!entry.activityId) return <div>{inner}</div>;
  return (
    <Link
      className="rounded-analysis hover:bg-analysis-surface-alt/60 block px-1 py-1 transition-colors"
      href={`/training/${entry.activityId}`}
    >
      {inner}
    </Link>
  );
}

function RecordRow({ entry, compact = false }: { entry: RecordEntry; compact?: boolean }) {
  const row = (
    <div
      className={cn('flex items-center justify-between gap-3 py-1.5 text-sm', compact && 'text-xs')}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-data text-muted-foreground w-5 shrink-0">#{entry.rank}</span>
        <span className="text-data font-semibold">{entry.displayValue}</span>
      </span>
      <span className="text-data text-muted-foreground truncate text-right">
        {entryMeta(entry)}
      </span>
    </div>
  );

  if (!entry.activityId) return row;
  return (
    <Link
      className="rounded-analysis hover:bg-analysis-surface-alt/60 block px-1 transition-colors"
      href={`/training/${entry.activityId}`}
    >
      {row}
    </Link>
  );
}

function PrGrid({ categories }: { categories: RecordCategory[] }) {
  const filled = categories.filter((c) => c.entries.length > 0).length;

  function getGridCols(count: number): string {
    if (count <= 1) return 'sm:grid-cols-1';
    if (count === 2) return 'sm:grid-cols-2';
    if (count === 3) return 'sm:grid-cols-2 lg:grid-cols-3';
    return 'sm:grid-cols-2 lg:grid-cols-4';
  }

  const cols = getGridCols(filled);

  return (
    <div className={cn('grid gap-3', cols)}>
      {categories.map((category) => (
        <RecordCategoryCard key={category.key} category={category} />
      ))}
    </div>
  );
}

function GpsAnalysisSection({
  powerCurve,
}: {
  powerCurve: import('@/lib/records').PowerCurvePoint[];
}) {
  if (powerCurve.length === 0) return null;

  return (
    <AnalyticsSection
      description="Puissance maximale soutenue par durée (vélo), calculée à partir des données capteur en cache."
      title="Courbe de puissance"
    >
      <PowerCurveChart data={powerCurve} />
    </AnalyticsSection>
  );
}

export function RecordsPanel() {
  const { data, isPending } = useRecords();
  const [tab, setTab] = useState<SportTab>('run');

  useEffect(() => {
    function syncTabFromHash() {
      const categoryId = window.location.hash.replace(/^#/, '');
      if (!categoryId) return;
      const sport = recordSportTabFromCategory(categoryId);
      if (sport) setTab(sport);
    }

    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  useEffect(() => {
    if (isPending || !data) return;
    const categoryId = window.location.hash.replace(/^#/, '');
    if (!categoryId) return;

    const frame = requestAnimationFrame(() => {
      document.getElementById(categoryId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, isPending, data]);

  if (isPending) {
    return <RecordsSkeleton />;
  }

  if (!data) return null;

  return (
    <section className="space-y-4 border-t pt-6" id="records">
      <RecordsSectionHeader
        streamsAnalyzed={data.streamsAnalyzed}
        totalActivities={data.totalActivities}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={navPillClass(tab === id, 'gap-2')}
            type="button"
            onClick={() => setTab(id)}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'run' && (
        <AnalyticsSection
          description="Meilleures performances agrégées depuis tes métriques de séance."
          title="Records course à pied"
        >
          <PrGrid categories={data.prs.run} />
        </AnalyticsSection>
      )}

      {tab === 'bike' && (
        <AnalyticsSection
          description="Puissance, dénivelé et durée — depuis tes sorties enregistrées."
          title="Records vélo"
        >
          <PrGrid categories={data.prs.bike} />
        </AnalyticsSection>
      )}

      {tab === 'swim' && (
        <AnalyticsSection
          description="Distance, allure et durée de tes séances natation."
          title="Records natation"
        >
          <PrGrid categories={data.prs.swim} />
        </AnalyticsSection>
      )}

      <PerformancePredictions />

      <GpsAnalysisSection powerCurve={data.powerCurve} />
    </section>
  );
}

function RecordsSkeleton() {
  return (
    <section className="border-border space-y-6 border-t pt-12">
      <div className="flex gap-4">
        <Skeleton className="size-11 rounded-2xl" />
        <div className="space-y-2">
          <SkeletonEyebrow className="w-24" />
          <SkeletonTitle className="w-56 max-w-full" size="lg" />
          <SkeletonText widths={['100%', '86%', '52%']} />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonPill key={i} className="h-10 w-28" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between gap-2">
              <SkeletonEyebrow className="w-20" />
              <Skeleton className="h-6 w-14 rounded-full border-0" />
            </div>
            <Skeleton className="mt-4 h-9 w-24 border-0" />
            <SkeletonText className="mt-3" widths={['88%', '62%']} />
          </SkeletonCard>
        ))}
      </div>
    </section>
  );
}
