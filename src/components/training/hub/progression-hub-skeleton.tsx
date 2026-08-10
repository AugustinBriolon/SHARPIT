'use client';

import { Activity, Medal, SlidersHorizontal } from 'lucide-react';

import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { navPillClass } from '@/lib/ui/nav-pill';

const TABS = [
  {
    id: 'etat',
    label: 'État',
    description: 'Où tu en es maintenant — forme, charge, fraîcheur et projection.',
    icon: Activity,
  },
  {
    id: 'records',
    label: 'Records',
    description: 'Tes meilleures performances observées et courbes de référence.',
    icon: Medal,
  },
  {
    id: 'calibration',
    label: 'Calibration',
    description: 'Les repères utilisés par SHARPIT pour interpréter tes efforts.',
    icon: SlidersHorizontal,
  },
] as const;

const [DEFAULT_TAB] = TABS;

/** Stable Progression chrome for Suspense fallback — default État tab, no search params. */
export function ProgressionHubSkeleton() {
  return (
    <div className="space-y-4">
      <MobileBackLink showOnDesktop />
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Progression</h1>
        <p className="text-muted-foreground mt-1 text-sm">{DEFAULT_TAB.description}</p>

        <nav
          aria-label="Sections Progression"
          className="-mx-1 mt-4 flex scrollbar-none gap-1.5 overflow-x-auto pb-0.5"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === 'etat';
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
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
