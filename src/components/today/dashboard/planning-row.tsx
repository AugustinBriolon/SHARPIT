'use client';

import { selectUpcomingPlannedPreview } from '@/lib/planned-session/planned-session-dates';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session/planned-session-display';
import { forecastBadgeFromContext } from '@/lib/planned-session/forecast-badge';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import type { ClientPlannedSession } from '@/lib/query/types';
import { useQueryClient } from '@tanstack/react-query';
import {
  InstrumentListChip,
  type InstrumentListChipMeta,
} from '@/components/ui/instrument-list-chip';
import { useAppModal } from '@/providers/app-modal-provider';

/**
 * Upcoming sessions as compact drill-down chips — no PhysioRail in the list hero.
 * Opens the global planned-session modal (no /planning redirect).
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
  const { openPlannedSession } = useAppModal();
  const today = new Date();
  const upcoming = selectUpcomingPlannedPreview(sessions, today, limit);

  if (upcoming.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {upcoming.map((s) => {
        const { intensityLabel, dateStr, title } = resolvePlannedSessionDisplay(s, today);
        const badge = forecastBadgeFromContext(s.environmentContext, s.exposureSetting);
        const meta: InstrumentListChipMeta[] = [];
        if (s.durationMin) meta.push(`${s.durationMin} min`);
        meta.push(dateStr);
        if (intensityLabel) meta.push(intensityLabel);
        if (badge) {
          meta.push({
            text: badge.label,
            tone: badge.tone === 'caution' ? 'caution' : 'default',
          });
        }

        return (
          <li key={s.id}>
            <InstrumentListChip
              activityType={s.type}
              meta={meta}
              title={title}
              onClick={() => openPlannedSession({ sessionId: s.id })}
              onFocus={() => prefetchPlannedSessionDetail(queryClient, s.id)}
              onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, s.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}
