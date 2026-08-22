import Link from 'next/link';
import { Activity, ChevronRight, Medal, SlidersHorizontal } from 'lucide-react';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import {
  PROGRESSION_SECTION_TITLE,
  PROGRESSION_TABS,
  progressionTabHref,
  type ProgressionTabId,
} from '@/lib/training/progression-tabs';
import { cn } from '@/lib/utils';

const DOOR_ICON: Record<ProgressionTabId, typeof Activity> = {
  etat: Activity,
  records: Medal,
  calibration: SlidersHorizontal,
};

/**
 * Three destinations, each announcing what it holds.
 *
 * Previously one "Progression →" hanging off a heading called "Dynamique
 * récente", which mentions neither records nor thresholds. The first fix named
 * the destinations but kept the route's own word as the section title and a
 * "Tout voir" that led to the État tab — a promise of an overview that does not
 * exist, since there is no combined page, only a default tab.
 *
 * So: no call to action, because there is nowhere else to go; the three cards are
 * the section. They borrow the settings navigation idiom — icon well, name,
 * one line, chevron — because that is what this app already uses to mean "this
 * takes you somewhere", and these had been reading as read-only panels.
 */
export function ProgressionDoors() {
  return (
    <section>
      <DrillDownSectionLabel as="h2">{PROGRESSION_SECTION_TITLE}</DrillDownSectionLabel>
      <ul className="grid gap-2 sm:grid-cols-3">
        {PROGRESSION_TABS.map((entry) => {
          const Icon = DOOR_ICON[entry.id];
          return (
            <li key={entry.id}>
              <Link
                href={progressionTabHref(entry.id)}
                className={cn(
                  'chip-surface-lg rounded-analysis-lg group flex h-full items-center gap-3 px-3 py-2.5',
                  'hover:border-primary/25 focus-visible:ring-primary/35',
                  'focus-visible:ring-2 focus-visible:outline-hidden',
                )}
              >
                <span className="icon-well size-9" aria-hidden>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{entry.label}</span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                    {entry.blurb}
                  </span>
                </span>
                <ChevronRight
                  className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
