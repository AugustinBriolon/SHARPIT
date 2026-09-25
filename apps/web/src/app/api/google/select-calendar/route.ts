import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setTargetCalendar } from '@/lib/integrations/google/google-sync';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';

const schema = z.object({
  calendarId: z.string().min(1),
  calendarName: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }
    await setTargetCalendar(athleteId, parsed.data.calendarId, parsed.data.calendarName ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le calendrier cible" },
      { status: 500 },
    );
  }
}
