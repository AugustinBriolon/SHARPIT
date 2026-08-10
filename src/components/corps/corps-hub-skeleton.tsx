'use client';

import { Activity, Scale } from 'lucide-react';

import { StickyHeader } from '@/components/layout/sticky-header';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { navPillClass } from '@/lib/ui/nav-pill';

const TABS = [
  {
    id: 'composition',
    label: 'Composition',
    description: 'Poids, masse grasse et tendances impédancemétrie.',
    icon: Scale,
  },
  {
    id: 'suivi',
    label: 'Suivi physique',
    description: 'Douleurs, blessures et points de vigilance.',
    icon: Activity,
  },
] as const;

const [DEFAULT_TAB] = TABS;

function CompositionValuePulse() {
  return (
    <div className="space-y-4 lg:space-y-5" aria-busy>
      <section className="surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-label text-ink-surface-foreground/65 inline-flex items-center gap-2">
            <span
              className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
              aria-hidden
            />
            Dernière pesée
          </p>
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-3"
            widthClassName="w-28"
          />
        </div>
        <div className="text-verdict text-ink-surface-foreground mt-6 text-[2rem] leading-none sm:text-[2.25rem]">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-10"
            widthClassName="w-28"
          />
        </div>
        <div className="border-ink-surface-foreground/20 bg-ink-surface-foreground/6 rounded-analysis mt-3 border px-3 py-2.5">
          <SkeletonDataValue
            className="bg-ink-surface-foreground/20"
            heightClassName="h-4"
            widthClassName="w-24"
          />
        </div>
      </section>

      <nav aria-label="Signaux de composition" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="chip-surface flex min-h-11 flex-col gap-1 rounded-2xl px-3 py-2.5 lg:min-h-9"
          >
            <SkeletonDataValue heightClassName="h-3" widthClassName="w-16" />
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-12" />
          </div>
        ))}
      </nav>
    </div>
  );
}

/** Stable Mon corps chrome for Suspense fallback — default Composition tab, no search params. */
export function CorpsHubSkeleton() {
  return (
    <div className="space-y-4">
      <StickyHeader>
        <p className="text-label">Mon corps</p>
        <h1 className="text-page-title mt-1">Forme & bien-être</h1>
        <p className="text-muted-foreground mt-1 text-sm">{DEFAULT_TAB.description}</p>

        <nav
          aria-label="Sections Mon corps"
          className="-mx-1 mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === 'composition';
            return (
              <span
                key={tab.id}
                aria-current={active ? 'page' : undefined}
                className={navPillClass(active)}
              >
                <Icon className="size-3.5" aria-hidden />
                {tab.label}
              </span>
            );
          })}
        </nav>
      </StickyHeader>

      <div className="space-y-4">
        <CompositionValuePulse />
      </div>
    </div>
  );
}
