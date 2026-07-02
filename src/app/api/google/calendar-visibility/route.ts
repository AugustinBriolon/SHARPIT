import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGoogleAccount, setHiddenCalendars } from '@/lib/integrations/google-sync';

export const dynamic = 'force-dynamic';

const schema = z.object({
  hiddenCalendarIds: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const account = await getGoogleAccount();
    if (!account) {
      return NextResponse.json({ error: 'Compte Google non connecté' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    await setHiddenCalendars(parsed.data.hiddenCalendarIds);
    return NextResponse.json({
      success: true,
      hiddenCalendarIds: parsed.data.hiddenCalendarIds,
    });
  } catch (error) {
    console.error('[google/calendar-visibility]', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
