import { NextRequest, NextResponse } from 'next/server';
import { GoogleOAuthError } from '@/lib/integrations/google/google';
import {
  getGoogleAccount,
  isGoogleConnected,
  listGoogleCalendars,
} from '@/lib/integrations/google/google-sync';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';

function mapCalendarListItem(
  calendar: Awaited<ReturnType<typeof listGoogleCalendars>>[number],
  hidden: Set<string>,
  targetId: string | null,
) {
  return {
    id: calendar.id,
    summary: calendar.summary,
    primary: calendar.primary ?? false,
    backgroundColor: calendar.backgroundColor ?? null,
    hidden: hidden.has(calendar.id),
    isTarget: calendar.id === targetId,
  };
}

function googleCalendarsErrorResponse(error: unknown) {
  if (error instanceof GoogleOAuthError && error.needsReconnect) {
    return NextResponse.json({ error: error.message, needsReconnect: true }, { status: 401 });
  }
  return NextResponse.json(
    { error: 'Impossible de récupérer les calendriers Google' },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const { searchParams } = new URL(request.url);
  void searchParams;

  try {
    const athleteId = await getCurrentAthleteId();
    const account = await getGoogleAccount(athleteId);
    if (!isGoogleConnected(account)) {
      return NextResponse.json([]);
    }

    const [calendars] = await Promise.all([listGoogleCalendars(athleteId)]);
    const hidden = new Set(account?.hiddenCalendarIds ?? []);
    const targetId = account?.targetCalendarId ?? null;
    return NextResponse.json(calendars.map((c) => mapCalendarListItem(c, hidden, targetId)));
  } catch (error) {
    console.error(error);
    return googleCalendarsErrorResponse(error);
  }
}
