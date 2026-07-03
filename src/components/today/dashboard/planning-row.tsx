import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  filterUpcomingPlannedSessions,
  formatPlannedSessionRelativeDay,
} from '@/lib/planned-session-dates';
import { ACTIVITY_COLOR, ACTIVITY_LABEL, INTENSITY_LABEL } from '@/lib/today-dashboard-labels';
import type { ClientPlannedSession } from '@/lib/query/types';

export function PlanningRow({ sessions }: { sessions: ClientPlannedSession[] }) {
  const today = new Date();
  const upcoming = filterUpcomingPlannedSessions(sessions, today).slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
        Prochaines séances
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {upcoming.map((s) => {
          const typeLabel = ACTIVITY_LABEL[s.type as string] ?? s.type;
          const typeColor =
            ACTIVITY_COLOR[s.type as string] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800';
          const intensityLabel = s.intensity
            ? (INTENSITY_LABEL[s.intensity as string] ?? s.intensity)
            : null;
          const dateStr = formatPlannedSessionRelativeDay(s.date, today);

          return (
            <Link
              key={s.id}
              className="bg-card hover:bg-muted/30 flex flex-col gap-2 rounded-xl border p-4 transition-colors"
              href="/planning"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase',
                    typeColor,
                  )}
                >
                  {typeLabel}
                </span>
                {s.durationMin && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {s.durationMin} min
                  </span>
                )}
              </div>
              <p className="line-clamp-1 text-xs leading-snug font-semibold text-slate-700 dark:text-slate-200">
                {s.title ?? typeLabel}
              </p>
              <p className="text-[10px] text-slate-400">{dateStr}</p>
              {intensityLabel && (
                <p className="text-[10px] font-medium text-slate-500">{intensityLabel}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
