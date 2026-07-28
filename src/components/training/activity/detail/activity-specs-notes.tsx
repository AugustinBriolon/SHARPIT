import { cn } from '@/lib/utils';
import type { ActivityDetail, ActivitySpec } from './types';

export function ActivitySpecsNotes({
  activity,
  specs,
}: {
  activity: ActivityDetail;
  specs: ActivitySpec[];
}) {
  if (specs.length === 0 && !activity.notes) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {specs.length > 0 && (
        <div className={cn(activity.notes ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <p className="text-label px-0.5">Caractéristiques</p>
          <div className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {specs.map((row) => (
              <div
                key={row.label}
                className="border-analysis-border/40 flex justify-between gap-4 border-b py-2 last:border-0 sm:nth-last-2:border-0"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {activity.notes && (
        <div
          className={cn(
            'analysis-panel-alt rounded-analysis-lg px-5 py-5',
            specs.length === 0 && 'lg:col-span-3',
          )}
        >
          <p className="text-label">Notes</p>
          <p className="text-foreground/80 mt-3 text-sm leading-relaxed whitespace-pre-wrap">
            {activity.notes}
          </p>
        </div>
      )}
    </section>
  );
}
