'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session/display/planned-session-display';
import { forecastBadgeFromContext } from '@/lib/planned-session/forecast/forecast-badge';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { formatTrainingLoad } from '@/lib/preferences/display-mode';
import { useAppModal } from '@/providers/app-modal-provider';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';

/**
 * The one session that is actually next, given its own block.
 *
 * It used to appear twice: as a sentence inside the goal plate ("Prochaine séance
 * · Natation Retour & Endurance") and again 250 px below as the first chip of a
 * list, where nothing distinguished it from the two behind it. Meanwhile the
 * countdown to a race fifty days out held the largest block on the page.
 *
 * The page is called Entraînement and its first question is what to train. So the
 * answer gets the room, and the race becomes the thin banner above it.
 */
export function TrainingNextSession({ session }: { session: ClientPlannedSession | null }) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();
  const { mode } = useDisplayMode();

  if (!session) {
    return (
      <section>
        <DrillDownSectionLabel as="h2">Prochaine séance</DrillDownSectionLabel>
        <InkEmptyState
          description="Ouvre le planning pour programmer la suite."
          icon={CalendarClock}
          title="Rien de prévu"
          compact
        />
      </section>
    );
  }

  const { intensityLabel, dateStr, title } = resolvePlannedSessionDisplay(session, new Date());
  const badge = forecastBadgeFromContext(session.environmentContext, session.exposureSetting);

  const meta = [
    session.durationMin ? `${session.durationMin} min` : null,
    dateStr,
    intensityLabel,
    session.load != null ? formatTrainingLoad(session.load, mode) : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <section>
      <DrillDownSectionLabel as="h2">Prochaine séance</DrillDownSectionLabel>
      <button
        type="button"
        className={cn(
          'chip-surface-lg rounded-analysis-lg group flex w-full items-center gap-4 px-4 py-4 text-left',
          'hover:border-primary/25 focus-visible:ring-primary/35',
          'focus-visible:ring-2 focus-visible:outline-hidden sm:px-5 sm:py-5',
        )}
        onClick={() => openPlannedSession({ sessionId: session.id })}
        onFocus={() => prefetchPlannedSessionDetail(queryClient, session.id)}
        onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, session.id)}
      >
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 flex items-center gap-2">
            <ActivityTypeIndicator type={session.type} />
          </span>
          <span className="text-foreground block truncate text-base font-medium sm:text-lg">
            {title}
          </span>
          <span className="text-muted-foreground text-data mt-1 block text-xs tabular-nums">
            {meta.join(' · ')}
          </span>
          {badge ? (
            <span
              className={cn(
                'mt-1.5 block text-xs',
                badge.tone === 'caution' ? 'text-signal-caution' : 'text-muted-foreground',
              )}
            >
              {badge.label}
            </span>
          ) : null}
        </span>

        <ArrowRight
          className="text-muted-foreground/60 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </section>
  );
}
