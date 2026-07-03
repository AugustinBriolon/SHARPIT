import { NextResponse } from 'next/server';
import { getGoogleAccount, listGoogleCalendars } from '@/lib/integrations/google-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const account = await getGoogleAccount();
    if (!account) {
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
    return NextResponse.json(
      { error: 'Impossible de récupérer les calendriers Google' },
      { status: 500 },
    );
  }
}
