import { fetchJson } from './shared';

export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  color: string | null;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
}

export async function fetchGoogleEvents(
  from: string,
  to: string,
): Promise<{ connected: boolean; events: GoogleCalendarEvent[] }> {
  return fetchJson(
    `/api/google/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
  hidden: boolean;
  isTarget: boolean;
}

export async function fetchGoogleCalendars(): Promise<GoogleCalendarInfo[]> {
  return fetchJson<GoogleCalendarInfo[]>('/api/google/calendars');
}
