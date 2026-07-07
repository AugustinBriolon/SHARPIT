import { NextResponse } from 'next/server';
import { GoogleOAuthError } from '@/lib/integrations/google';
import {
  getGoogleAccount,
  isGoogleConnected,
  listGoogleCalendars,
} from '@/lib/integrations/google-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const account = await getGoogleAccount();
    if (!isGoogleConnected(account)) {
      return NextResponse.json([]);
    }

    const [calendars] = await Promise.all([listGoogleCalendars()]);
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
