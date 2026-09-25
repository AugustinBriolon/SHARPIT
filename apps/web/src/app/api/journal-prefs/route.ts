import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { hasProAccess } from '@/lib/access/tier';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  defaultJournalPrefs,
  parseJournalPrefs,
  sanitizeJournalPrefsForPersist,
} from '@/lib/journal/journal-prefs';
import { awaitRequest } from '@/lib/next/await-request';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const profile = await prisma.athleteProfile.findUnique({
      where: { id: athleteId },
      select: { journalPrefs: true, tier: true },
    });
    const isPro = hasProAccess(profile?.tier ?? 'FREE');
    const prefs = profile?.journalPrefs
      ? parseJournalPrefs(profile.journalPrefs)
      : defaultJournalPrefs();
    return NextResponse.json({ prefs, isPro });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les préférences journal' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const profile = await prisma.athleteProfile.findUnique({
      where: { id: athleteId },
      select: { tier: true },
    });
    const isPro = hasProAccess(profile?.tier ?? 'FREE');
    const body = (await request.json()) as { prefs?: unknown };
    const prefs = sanitizeJournalPrefsForPersist(body.prefs, isPro);
    await prisma.athleteProfile.update({
      where: { id: athleteId },
      data: { journalPrefs: prefs as Prisma.InputJsonValue },
    });
    return NextResponse.json({ prefs, isPro });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible d’enregistrer les préférences journal' },
      { status: 500 },
    );
  }
}
