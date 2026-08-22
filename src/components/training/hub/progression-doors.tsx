import Link from 'next/link';
import { TrainingSectionLink } from '@/components/training/hub/training-dashboard-shell';
import {
  PROGRESSION_BASE_PATH,
  PROGRESSION_TABS,
  progressionTabHref,
} from '@/lib/training/progression-tabs';
import { cn } from '@/lib/utils';

/**
 * Named doors to Progression.
 *
 * It used to be one "Progression →" hanging off a heading called "Dynamique
 * récente", which mentions neither records nor thresholds — so reaching your FTP
 * meant guessing that it lived behind a link about recent dynamics, then finding
 * the right tab. Each destination now says what is inside it.
 *
 * Nothing here depends on data, so the loading shell renders the real thing
 * rather than a skeleton, and the section never moves under the cursor.
 */
export function ProgressionDoors() {
  return (
    <section>
      <TrainingSectionLink cta="Tout voir" href={PROGRESSION_BASE_PATH} title="Progression" />
      <div className="grid gap-2 sm:grid-cols-3">
        {PROGRESSION_TABS.map((entry) => (
          <Link
            key={entry.id}
            href={progressionTabHref(entry.id)}
            className={cn(
              'border-analysis-border/60 bg-background/40 rounded-analysis border p-3',
              'hover:border-analysis-border focus-visible:outline-ring transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2',
            )}
          >
            <span className="text-foreground block text-sm font-medium">{entry.label}</span>
            <span className="text-muted-foreground mt-0.5 block text-xs">{entry.blurb}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
