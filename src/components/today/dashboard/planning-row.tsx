import Link from 'next/link';
import { forecastBadgeFromContext } from '@/lib/planned-session/forecast-badge';
import { Badge } from '@/components/ui/badge';
import { PhysioRail } from '@/components/ui/physio-rail';
import { intensityOrder } from '@/lib/sessions';
import { filterUpcomingPlannedSessions } from '@/lib/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import type { ClientPlannedSession } from '@/lib/query/types';
import { plannedSessionHref } from '@/lib/session-analysis-display';
import { PlannedSessionTypeBadge } from './planned-session-type-badge';

function planningBadgeClass(tone: string): string {
  if (tone === 'caution') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-700';
  }
  if (tone === 'ok') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700';
  }
  return 'font-normal';
}

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

          const badge = forecastBadgeFromContext(s.environmentContext, s.exposureSetting);

          return (
            <Link
              key={s.id}
              href={plannedSessionHref(s.id)}
              className={[
                'analysis-panel hover:bg-analysis-surface-alt/60 rounded-analysis flex min-h-11 flex-col transition-colors active:opacity-80 lg:min-h-0',
                compact ? 'gap-1.5 p-3' : 'gap-2 p-4',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <PlannedSessionTypeBadge session={s} />
                <div className="flex items-center gap-2">
                  {badge ? (
                    <Badge className={planningBadgeClass(badge.tone)} variant="outline">
                      {badge.label}
                    </Badge>
                  ) : null}
                  {s.durationMin ? (
                    <span className="text-data text-muted-foreground text-[11px]">
                      {s.durationMin} min
                    </span>
                  ) : null}
                </div>
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
