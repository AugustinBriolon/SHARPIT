'use client';

import { RecordsSectionHeader } from '@/components/analytics/analytics-cards';
import { PowerCurveChart } from '@/components/analytics/charts/power-curve-chart';
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
import {
  recordCategoryAnchorId,
  recordSportTabFromCategory,
  type RecordCategory,
  type RecordEntry,
  type RecordSportTab,
} from '@/lib/training/records';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays, format, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bike, Footprints, Waves } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

type SportTab = RecordSportTab;

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

function isSportTab(value: string | null): value is SportTab {
  return value === 'run' || value === 'bike' || value === 'swim';
}
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

function sportSwitcherClass(active: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
    active
      ? 'border-foreground/12 bg-foreground/6 text-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]'
      : 'border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  );
}

function RecordHero({ entry }: { entry: RecordEntry }) {
  const meta = entryMeta(entry);
  const narrative = recordNarrative(entry);
  const content = (
    <div className="rounded-analysis bg-muted/35 flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.16em] uppercase">
          #1
        </p>
        <p className="text-data text-record-accent mt-1 text-[1.7rem] leading-none font-semibold">
          {entry.displayValue}
        </p>
        <p className="text-data text-muted-foreground mt-2 text-xs">{meta}</p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">{narrative}</p>
      </div>
      {isRecent(entry.date) ? (
        <Badge className="border-primary/30 text-primary shrink-0" variant="outline">
          Nouveau
        </Badge>
      ) : null}
    </div>
  );

  if (!entry.activityId) return content;
  return (
    <Link
      className="rounded-analysis hover:bg-analysis-surface-alt/40 block transition-colors"
      href={`/training/${entry.activityId}`}
    >
      {content}
    </Link>
  );
}

function LeaderboardRow({ entry }: { entry: RecordEntry }) {
  const content = (
    <div className="rounded-analysis hover:bg-analysis-surface-alt/40 flex flex-col gap-1.5 px-2 py-2 transition-colors md:flex-row md:items-center md:justify-between md:gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-data text-muted-foreground w-6 shrink-0 text-xs">#{entry.rank}</span>
        <div className="min-w-0">
          <p className="text-data truncate text-sm font-semibold">{entry.displayValue}</p>
          <p className="text-data text-muted-foreground truncate text-[11px]">{entryMeta(entry)}</p>
        </div>
      </div>
      <span className="text-muted-foreground pl-9 text-[11px] md:shrink-0 md:pl-0">
        {recordNarrative(entry)}
      </span>
    </div>
  );

  if (!entry.activityId) return content;
  return (
    <Link className="rounded-analysis block" href={`/training/${entry.activityId}`}>
      {content}
    </Link>
  );
}

function RecordCategoryLeaderboard({ category }: { category: RecordCategory }) {
  const [best, ...others] = category.entries;

  return (
    <div
      className="analysis-panel rounded-analysis-lg scroll-mt-24 space-y-3 p-3"
      id={recordCategoryAnchorId(category.key)}
    >
      <div className="space-y-1">
        <p className="text-label">{category.label}</p>
        <p className="text-muted-foreground text-[11px]">
          Top 5 observé sur tes séances enregistrées.
        </p>
      </div>

      {best ? (
        <>
          <RecordHero entry={best} />
          {others.length > 0 && (
            <div className="border-analysis-border/70 space-y-1 border-t pt-2">
              {others.map((entry) => (
                <LeaderboardRow key={entry.rank} entry={entry} />
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

function PrGrid({ categories }: { categories: RecordCategory[] }) {
  const filled = categories.filter((c) => c.entries.length > 0).length;

  function getGridCols(count: number): string {
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'xl:grid-cols-2';
    if (count === 3) return 'xl:grid-cols-2';
    return 'xl:grid-cols-2';
  }

  const cols = getGridCols(filled);

  return (
    <div className={cn('grid grid-cols-1 gap-3 xl:gap-4', cols)}>
      {categories.map((category) => (
        <RecordCategoryLeaderboard key={category.key} category={category} />
      ))}
    </div>
  );
}

function GpsAnalysisSection({
  powerCurve,
}: {
  powerCurve: import('@/lib/training/records').PowerCurvePoint[];
}) {
  if (powerCurve.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="space-y-1">
        <p className="text-label">Analyse secondaire</p>
        <h3 className="text-section-title">Courbe de puissance</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Référence vélo complémentaire issue des données capteur en cache.
        </p>
      </div>
      <PowerCurveChart data={powerCurve} />
    </section>
  );
}

export function RecordsPanel() {
  const { data, isPending } = useRecords();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sportParam = searchParams.get('sport');
  const tab: SportTab = isSportTab(sportParam) ? sportParam : 'run';

  function setSportTab(next: SportTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'records');
    params.set('sport', next);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    router.replace(`/training/progression?${params.toString()}${hash}`, { scroll: false });
  }

  useEffect(() => {
    function syncSportFromHash() {
      const categoryId = window.location.hash.replace(/^#/, '');
      if (!categoryId) return;
      const sport = recordSportTabFromCategory(categoryId);
      if (!sport || sport === tab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'records');
      params.set('sport', sport);
      router.replace(`/training/progression?${params.toString()}#${categoryId}`, {
        scroll: false,
      });
    }

    syncSportFromHash();
    window.addEventListener('hashchange', syncSportFromHash);
    return () => window.removeEventListener('hashchange', syncSportFromHash);
  }, [router, searchParams, tab]);

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

  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];
  let activeCategories = data.prs.run;
  if (tab === 'bike') activeCategories = data.prs.bike;
  if (tab === 'swim') activeCategories = data.prs.swim;

  return (
    <section className="space-y-4" id="records">
      <RecordsSectionHeader
        streamsAnalyzed={data.streamsAnalyzed}
        totalActivities={data.totalActivities}
      />

      <div className="space-y-3">
        <div
          aria-label="Sport filtré"
          className="bg-muted/45 inline-flex max-w-full overflow-x-auto rounded-full p-1"
          role="tablist"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-selected={tab === id}
              className={sportSwitcherClass(tab === id)}
              role="tab"
              type="button"
              onClick={() => setSportTab(id)}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-label">{activeTab.label}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Classements observés sur tes données réelles, par catégorie.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px]" role="tabpanel">
        <PrGrid categories={activeCategories} />
      </div>

      <GpsAnalysisSection powerCurve={data.powerCurve} />
    </section>
  );
}

function RecordsSkeleton() {
  return (
    <section className="space-y-5">
      <div className="flex gap-4">
        <Skeleton className="size-11 rounded-2xl" />
        <div className="space-y-2">
          <SkeletonEyebrow className="w-24" />
          <SkeletonTitle className="w-56 max-w-full" size="lg" />
          <SkeletonText widths={['100%', '86%', '52%']} />
        </div>
      </div>
      <div className="bg-muted/45 inline-flex rounded-full p-1">
        {TABS.map(({ id }) => (
          <SkeletonPill key={id} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        <SkeletonEyebrow className="w-16" />
        <SkeletonText widths={['46%', '68%']} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonEyebrow className="w-24" />
            <Skeleton className="mt-3 h-24 rounded-xl border-0" />
            <SkeletonText className="mt-3" widths={['94%', '88%', '80%']} />
          </SkeletonCard>
        ))}
      </div>
    </section>
  );
}
