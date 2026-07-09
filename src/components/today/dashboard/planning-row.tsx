import Link from 'next/link';
import { PhysioRail } from '@/components/ui/physio-rail';
import { intensityOrder } from '@/lib/sessions';
import { filterUpcomingPlannedSessions } from '@/lib/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import type { ClientPlannedSession } from '@/lib/query/types';
import { PlannedSessionTypeBadge } from './planned-session-type-badge';

export function PlanningRow({
  sessions,
  limit = 4,
  compact = false,
}: {
  sessions: ClientPlannedSession[];
  limit?: number;
  compact?: boolean;
}) {
  const today = new Date();
  const upcoming = filterUpcomingPlannedSessions(sessions, today).slice(0, limit);

  if (upcoming.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {upcoming.map((s) => {
          const { intensityLabel, dateStr, title } = resolvePlannedSessionDisplay(s, today);
          const intensityValue = s.intensity ? intensityOrder.indexOf(s.intensity) + 1 : null;

          return (
            <Link
              key={s.id}
              href="/seances?tab=planning"
              className={[
                'analysis-panel hover:bg-analysis-surface-alt/60 rounded-analysis flex min-h-11 flex-col transition-colors active:opacity-80 lg:min-h-0',
                compact ? 'gap-1.5 p-3' : 'gap-2 p-4',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <PlannedSessionTypeBadge session={s} />
                {s.durationMin && (
                  <span className="text-data text-muted-foreground text-[11px]">
                    {s.durationMin} min
                  </span>
                )}
              </div>
              <p
                className={[
                  'text-foreground line-clamp-2 leading-snug font-semibold',
                  compact ? 'text-xs' : 'text-sm',
                ].join(' ')}
              >
                {title}
              </p>
              <p className="text-data text-muted-foreground text-[11px]">{dateStr}</p>
              <PhysioRail
                max={6}
                value={intensityValue}
                markerLabel={
                  intensityLabel
                    ? `intensité ${intensityLabel.toLowerCase()}`
                    : 'intensité à préciser'
                }
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
