import { NextRequest, NextResponse } from 'next/server';
import { defaultExposureForActivityType } from '@/core/planned-session/defaults';
import { pushSessionToGoogle } from '@/lib/integrations/google-sync';
import { createPlannedSession, getPlannedSessionById, getPlannedSessions } from '@/lib/queries';
import { refreshAndPersistPlannedSessionContext } from '@/lib/planned-session/resolve-context';
import { createPlannedSessionSchema } from '@/lib/validators/planned-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const sessions = await getPlannedSessions({
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les séances planifiées' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPlannedSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const session = await createPlannedSession({
      ...(parsed.data as Parameters<typeof createPlannedSession>[0]),
      exposureSetting:
        parsed.data.exposureSetting ?? defaultExposureForActivityType(parsed.data.type),
    });

    try {
      await refreshAndPersistPlannedSessionContext(session.id);
    } catch (ctxError) {
      console.error('[planned-sessions/context]', ctxError);
    }

    // Synchro App → Google Calendar (best-effort : n'échoue pas la création).
    try {
      await pushSessionToGoogle(session);
    } catch (syncError) {
      console.error('Push Google Calendar échoué', syncError);
    }

    const fresh = await getPlannedSessionById(session.id);
    return NextResponse.json(fresh ?? session, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de créer la séance planifiée' }, { status: 500 });
  }
}
