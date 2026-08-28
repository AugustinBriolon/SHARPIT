import type { InstrumentListChipMeta } from '@/components/ui/instruments/instrument-list-chip';
import type { ClientPlannedSession } from '@/lib/query/types';
import { groupPlannedSessions } from '@/lib/planned-session/brick/brick-sessions';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';

export function firstOpenPlannedSessionId(
  groups: ReturnType<typeof groupPlannedSessions>,
): string | null {
  for (const item of groups) {
    if (item.kind === 'single' && !item.session.completed) {
      return item.session.id;
    }
    if (item.kind === 'brick') {
      const open = item.sessions.find((s) => !s.completed);
      if (open) {
        return open.id;
      }
    }
  }
  return null;
}

export function plannedSessionMeta(
  session: ClientPlannedSession,
  goalTitle?: string | null,
): InstrumentListChipMeta[] {
  const meta: InstrumentListChipMeta[] = [];
  if (session.startTime) {
    meta.push(session.startTime);
  }
  if (session.durationMin !== null) {
    meta.push(formatPlannedDuration(session.durationMin));
  }
  if (goalTitle) {
    meta.push(`Sert ${goalTitle}`);
  }
  return meta;
}
