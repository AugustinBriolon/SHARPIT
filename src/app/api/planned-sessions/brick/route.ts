import { NextRequest, NextResponse } from 'next/server';
import { pushSessionToGoogleInBackground } from '@/lib/google-sync';
import { createBrickSessions, getPlannedSessionById } from '@/lib/queries';
import { createBrickSchema } from '@/lib/validators/planned-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBrickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { date, startTime, legs } = parsed.data;
    const created = await createBrickSessions(
      legs.map((leg) => ({
        type: leg.type,
        date,
        startTime: startTime ?? null,
        title: leg.title ?? null,
        description: leg.description ?? null,
        durationMin: leg.durationMin ?? null,
        load: leg.load ?? null,
        intensity: leg.intensity ?? null,
      })),
    );

    for (const session of created) {
      pushSessionToGoogleInBackground(session);
    }

    const fresh = await Promise.all(created.map((s) => getPlannedSessionById(s.id)));
    return NextResponse.json(fresh.filter(Boolean), { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de créer le brick' }, { status: 500 });
  }
}
