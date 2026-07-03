'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bike, Footprints, Waves } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PerformancePredictions } from '@/components/analytics/performance-predictions';
import { PowerCurveChart } from '@/components/analytics/power-curve-chart';
import { AnalyticsSection, RecordsSectionHeader } from '@/components/analytics/analytics-cards';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecords } from '@/hooks/use-data';
import { navPillClass } from '@/lib/nav-pill';
import type { RecordCategory, RecordEntry } from '@/lib/records';
import { cn } from '@/lib/utils';

type SportTab = 'run' | 'bike' | 'swim';

const TABS: {
  id: SportTab;
  label: string;
  icon: typeof Footprints;
}[] = [
  { id: 'run', label: 'Course', icon: Footprints },
  { id: 'bike', label: 'Vélo', icon: Bike },
  { id: 'swim', label: 'Natation', icon: Waves },
];

function isRecent(dateIso: string): boolean {
  return differenceInCalendarDays(new Date(), new Date(dateIso)) <= 14;
}

function entryMeta(entry: RecordEntry): string {
  const date = format(new Date(entry.date), 'd MMM yyyy', { locale: fr });
  return entry.sublabel ? `${entry.sublabel} · ${date}` : date;
}

function RecordCategoryCard({ category }: { category: RecordCategory }) {
  const [best] = category.entries;

  return (
    <div className="bg-card/60 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.15em] uppercase">
          {category.label}
        </p>
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
            <div className="border-border/60 mt-3 space-y-0.5 border-t pt-2">
              {category.entries.slice(1).map((entry) => (
                <RecordRow key={entry.rank} entry={entry} compact />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground/50 mt-3 font-mono text-2xl font-semibold tabular-nums">
          —
        </p>
      )}
    </div>
  );
}

function RecordValue({ entry }: { entry: RecordEntry }) {
  const inner = (
    <>
      <p className="text-foreground mt-2 font-mono text-2xl font-semibold tabular-nums">
        {entry.displayValue}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{entryMeta(entry)}</p>
    </>
  );

  if (!entry.activityId) return <div>{inner}</div>;
  return (
    <Link
      className="hover:text-primary block rounded-md transition-colors"
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
        <span className="text-muted-foreground w-5 shrink-0 font-mono">#{entry.rank}</span>
        <span className="font-mono font-semibold tabular-nums">{entry.displayValue}</span>
      </span>
      <span className="text-muted-foreground truncate text-right">{entryMeta(entry)}</span>
    </div>
  );

  if (!entry.activityId) return row;
  return (
    <Link
      className="hover:bg-muted/50 block rounded-md px-1 transition-colors"
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
  const { data, isLoading } = useRecords();
  const [tab, setTab] = useState<SportTab>('run');

  if (isLoading) {
    return <RecordsSkeleton />;
  }

  if (!data) return null;

  return (
    <section className="space-y-4 border-t pt-6">
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
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </section>
  );
}
