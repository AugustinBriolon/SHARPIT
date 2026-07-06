import Link from 'next/link';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { filterUpcomingPlannedSessions } from '@/lib/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import type { ClientPlannedSession } from '@/lib/query/types';
import { PlannedSessionTypeBadge } from './planned-session-type-badge';

export function PlanningRow({ sessions }: { sessions: ClientPlannedSession[] }) {
  const today = new Date();
  const upcoming = filterUpcomingPlannedSessions(sessions, today).slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      <EyebrowLabel variant="dashboard">Prochaines séances</EyebrowLabel>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {upcoming.map((s) => {
          const { intensityLabel, dateStr, title } = resolvePlannedSessionDisplay(s, today);

          return (
            <Link
              key={s.id}
              className="bg-card hover:bg-muted/30 flex min-h-11 flex-col gap-2 rounded-xl border p-4 transition-colors active:opacity-80 lg:min-h-0"
              href="/planning"
            >
              <div className="flex items-center justify-between">
                <PlannedSessionTypeBadge referenceDate={today} session={s} />
                {s.durationMin && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {s.durationMin} min
                  </span>
                )}
              </div>
              <p className="line-clamp-1 text-xs leading-snug font-semibold text-slate-700 dark:text-slate-200">
                {title}
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
