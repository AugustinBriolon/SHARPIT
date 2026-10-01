import { NextRequest, NextResponse } from 'next/server';
import { brickEvaluationSchema } from '@sharpit/app/lib/validators/brick-evaluation';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  getBrickEvaluation,
  getBrickSessions,
  setBrickEvaluation,
} from '@sharpit/server/lib/queries';

async function isOwnBrick(athleteId: string, groupId: string) {
  const legs = await getBrickSessions(athleteId, groupId);
  return legs.length >= 2;
}

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const groupId = request.nextUrl.searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId requis' }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const evaluation = await getBrickEvaluation(athleteId, groupId);
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('[brick/evaluation][GET]', error);
    return NextResponse.json({ error: "Impossible de charger l'évaluation" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await request.json().catch(() => ({}));
    const parsed = brickEvaluationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Évaluation invalide', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { brickGroupId, ...fields } = parsed.data;
    if (!(await isOwnBrick(athleteId, brickGroupId))) {
      return NextResponse.json({ error: 'Brick introuvable' }, { status: 404 });
    }

    const evaluation = await setBrickEvaluation(athleteId, brickGroupId, fields);
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('[brick/evaluation][PUT]', error);
    return NextResponse.json(
      { error: "L'évaluation n'a pas pu être enregistrée" },
      { status: 500 },
    );
  }
}
