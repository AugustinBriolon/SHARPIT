import { selectUpcomingPlannedPreview } from '@/lib/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session-display';
import { forecastBadgeFromContext } from '@/lib/planned-session/forecast-badge';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { plannedSessionHref } from '@/lib/session-analysis-display';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PlannedSessionTypeBadge } from './planned-session-type-badge';
import { cn } from '@/lib/utils';

/**
 * Upcoming sessions as compact drill-down chips — no PhysioRail in the list hero.
 */
export function PlanningRow({
  sessions,
  limit = 4,
}: {
  sessions: ClientPlannedSession[];
  limit?: number;
  /** @deprecated Ignored — chips are always dense. */
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const today = new Date();
  const upcoming = selectUpcomingPlannedPreview(sessions, today, limit);

  if (upcoming.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {upcoming.map((s) => {
        const { intensityLabel, dateStr, title } = resolvePlannedSessionDisplay(s, today);
        const badge = forecastBadgeFromContext(s.environmentContext, s.exposureSetting);

        return (
          <li key={s.id}>
            <Link
              href={plannedSessionHref(s.id)}
              title={`Voir le détail — ${title}`}
              className={cn(
                'border-analysis-border/80 bg-background/50 hover:border-primary/35 hover:bg-muted/40',
                'focus-visible:ring-primary/35 flex w-full min-w-0 items-center justify-between gap-2',
                'rounded-lg border px-3 py-2.5 transition-[border-color,background-color] duration-150',
                'focus-visible:ring-2 focus-visible:outline-hidden',
              )}
              onFocus={() => prefetchPlannedSessionDetail(queryClient, s.id)}
              onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, s.id)}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <PlannedSessionTypeBadge session={s} />
                  {s.durationMin ? (
                    <span className="text-data text-muted-foreground shrink-0 text-[11px]">
                      {s.durationMin} min
                    </span>
                  ) : null}
                </span>
                <span className="text-foreground line-clamp-1 text-sm leading-snug font-medium">
                  {title}
                </span>
                <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-[11px]">
                  <span className="text-data">{dateStr}</span>
                  {intensityLabel ? (
                    <>
                      <span className="opacity-30" aria-hidden>
                        ·
                      </span>
                      <span>{intensityLabel}</span>
                    </>
                  ) : null}
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
                </span>
              </span>
              <span
                className="text-muted-foreground/70 text-data shrink-0 text-[10px] tracking-wider"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
