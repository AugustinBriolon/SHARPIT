import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getDayJournalEntry, upsertDayJournalEntryDb } from '@/lib/journal/day-journal-service';
import { awaitRequest } from '@/lib/next/await-request';
import { prisma } from '@/lib/prisma';

const factorStateSchema = z.enum(['unset', 'no', 'yes']);

const putSchema = z.object({
  trainingDayId: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  factors: z.record(z.string(), factorStateSchema).optional(),
  moodLabel: z.string().nullable().optional(),
  hydrationMl: z.number().int().nonnegative().nullable().optional(),
  caffeineMg: z.number().int().nonnegative().nullable().optional(),
});

export async function GET(request: NextRequest) {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const trainingDayId = request.nextUrl.searchParams.get('day');
    if (!trainingDayId || !/^\d{4}-\d{2}-\d{2}$/.test(trainingDayId)) {
      return NextResponse.json({ error: 'Paramètre day requis (YYYY-MM-DD)' }, { status: 400 });
    }
    const entry = await getDayJournalEntry(prisma, athleteId, trainingDayId);
    return NextResponse.json({ entry });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger le journal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload journal invalide' }, { status: 400 });
    }
    const entry = await upsertDayJournalEntryDb(prisma, athleteId, parsed.data);
    return NextResponse.json({ entry });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible d’enregistrer le journal' }, { status: 500 });
  }
}
