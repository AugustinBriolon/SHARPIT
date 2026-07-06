import type { GoogleCalendarEvent } from '@/lib/query/fetchers';
import type { ClientPlannedSession } from '@/lib/query/types';

export type DialogState =
  | { mode: 'create'; date: Date }
  | { mode: 'edit'; session: ClientPlannedSession }
  | { mode: 'brick'; sessions: ClientPlannedSession[] }
  | null;

export type DayEvent = {
  event: GoogleCalendarEvent;
  isStart: boolean;
  isEnd: boolean;
};

export const CALENDAR_WEEK_OPTS = { weekStartsOn: 1 as const };
