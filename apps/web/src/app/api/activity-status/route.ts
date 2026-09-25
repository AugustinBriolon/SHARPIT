import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  getActivityStatusStoreDb,
  setActivityStatusDb,
} from '@/lib/health/activity-status-service';
import { awaitRequest } from '@/lib/next/await-request';
import { prisma } from '@/lib/prisma';

const putSchema = z.object({
  status: z.enum(['active', 'paused', 'injured', 'sick']),
  retention: z
    .discriminatedUnion('kind', [
      z.object({ kind: z.literal('until_modified') }),
      z.object({
        kind: z.literal('until_date'),
        untilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    ])
    .optional(),
  travelId: z.string().nullable().optional(),
});

export async function GET() {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const store = await getActivityStatusStoreDb(prisma, athleteId);
    return NextResponse.json({ store });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger le statut d’activité' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload statut invalide' }, { status: 400 });
    }
    const store = await setActivityStatusDb(prisma, athleteId, parsed.data);
    return NextResponse.json({ store });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible d’enregistrer le statut d’activité' },
      { status: 500 },
    );
  }
}
