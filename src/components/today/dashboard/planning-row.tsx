import { PhysioRail } from '@/components/ui/physio-rail';
import { selectUpcomingPlannedPreview } from '@/lib/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import { forecastBadgeFromContext } from '@/lib/planned-session/forecast-badge';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { plannedSessionHref } from '@/lib/session-analysis-display';
import { intensityOrder } from '@/lib/sessions';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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
  const queryClient = useQueryClient();
  const today = new Date();
  const upcoming = selectUpcomingPlannedPreview(sessions, today, limit);

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
              onFocus={() => prefetchPlannedSessionDetail(queryClient, s.id)}
              onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, s.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <PlannedSessionTypeBadge session={s} />
                {s.durationMin ? (
                  <span className="text-data text-muted-foreground shrink-0 text-[11px]">
                    {s.durationMin} min
                  </span>
                ) : null}
              </div>
              <p
                className={[
                  'text-foreground line-clamp-2 leading-snug font-semibold',
                  compact ? 'text-xs' : 'text-sm',
                ].join(' ')}
              >
                {title}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                <span className="text-data">{dateStr}</span>
                {badge ? (
                  <>
                    <span className="opacity-30" aria-hidden>
                      ·
                    </span>
                    <span
                      className={
                        badge.tone === 'caution' ? 'text-signal-caution' : 'text-muted-foreground'
                      }
                    >
                      {badge.label}
                    </span>
                  </>
                ) : null}
              </div>
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
