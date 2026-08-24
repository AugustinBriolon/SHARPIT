import { NextRequest, NextResponse } from 'next/server';
import { GoogleOAuthError } from '@/lib/integrations/google/google';
import {
  getGoogleAccount,
  isGoogleConnected,
  listGoogleCalendars,
} from '@/lib/integrations/google/google-sync';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';

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
    return NextResponse.json(
      calendars.map((c) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary ?? false,
        backgroundColor: c.backgroundColor ?? null,
        hidden: hidden.has(c.id),
        isTarget: c.id === targetId,
      })),
    );
  } catch (error) {
    console.error(error);
    if (error instanceof GoogleOAuthError && error.needsReconnect) {
      return NextResponse.json({ error: error.message, needsReconnect: true }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Impossible de récupérer les calendriers Google' },
      { status: 500 },
    );
  }
}
