import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents, getGoogleAccount } from '@/lib/integrations/google/google-sync';

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const account = await getGoogleAccount();
    if (!account) {
      return NextResponse.json({ connected: false, events: [] });
    }

    if (!from || !to) {
      return NextResponse.json({ error: "Paramètres 'from' et 'to' requis" }, { status: 400 });
    }

    const events = await getCalendarEvents(new Date(from), new Date(to));
    return NextResponse.json({ connected: true, events });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de récupérer les événements Google' },
      { status: 500 },
    );
  }
}
