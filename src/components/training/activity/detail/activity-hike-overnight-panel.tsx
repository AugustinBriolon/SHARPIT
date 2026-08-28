'use client';

import { ActivityType } from '@prisma/client';
import { SPORT_IDENTITY_PANEL } from '@/lib/activity/sport-identity';
import type { HikeOvernightSummary } from '@/lib/activity/hike/hike-overnight-summary';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';
import { buildOvernightPanelRows } from '@/components/training/activity/detail/activity-hike-overnight-helpers';

export function ActivityHikeOvernightPanel({ summary }: { summary: HikeOvernightSummary }) {
  const { mode } = useDisplayMode();
  // Day hikes already surface metrics in hero + specs — panel is overnight-only.
  if (summary.variant !== 'overnight') {
    return null;
  }

  const rows = buildOvernightPanelRows(summary, mode);
  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Nuitée"
      className={cn('analysis-panel space-y-3 border p-4', SPORT_IDENTITY_PANEL[ActivityType.HIKE])}
    >
      <h2 className="text-section-title">Nuitée</h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-label text-muted-foreground">{row.label}</dt>
            <dd className="text-data mt-1 truncate">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
