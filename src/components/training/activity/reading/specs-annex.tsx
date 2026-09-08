'use client';

import { filterByAudience } from '@/lib/preferences/display-mode';
import { useDisplayMode } from '@/providers/display-mode-provider';
import type { ActivityDetail, ActivitySpec } from '@/components/training/activity/detail/types';

export function SpecsAnnex({
  activity,
  specs,
}: {
  activity: ActivityDetail;
  specs: ActivitySpec[];
}) {
  const { mode, isExpert } = useDisplayMode();
  const visibleSpecs = filterByAudience(specs, mode);

  if (visibleSpecs.length === 0 && !activity.notes) {
    return null;
  }

  return (
    <section className="activity-log-annex space-y-4">
      {visibleSpecs.length > 0 ? (
        <div>
          <h2 className="text-section-title text-foreground">Caractéristiques</h2>
          {isExpert ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Lecture expert — champs techniques inclus
            </p>
          ) : null}
          <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {visibleSpecs.map((row) => (
              <div key={row.label} className="activity-log-rule-row flex justify-between gap-4">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-data text-right font-medium tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activity.notes ? (
        <div className="activity-log-notes px-4 py-4 sm:px-5">
          <p className="text-section-title">Notes</p>
          <p className="text-foreground/85 mt-3 text-sm leading-relaxed whitespace-pre-wrap">
            {activity.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}
