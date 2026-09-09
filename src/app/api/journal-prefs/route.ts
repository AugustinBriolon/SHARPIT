import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  defaultJournalPrefs,
  parseJournalPrefs,
  sanitizeJournalPrefsForPersist,
} from '@/lib/health/journal-prefs';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const profile = await prisma.athleteProfile.findUnique({
      where: { id: athleteId },
      select: { journalPrefs: true },
    });
    const prefs = profile?.journalPrefs
      ? parseJournalPrefs(profile.journalPrefs)
      : defaultJournalPrefs();
    return NextResponse.json({ prefs });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les préférences journal' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = (await request.json()) as { prefs?: unknown };
    const prefs = sanitizeJournalPrefsForPersist(body.prefs);
    await prisma.athleteProfile.update({
      where: { id: athleteId },
      data: { journalPrefs: prefs as Prisma.InputJsonValue },
    });
    return NextResponse.json({ prefs });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible d’enregistrer les préférences journal' },
      { status: 500 },
    );
  }
}
