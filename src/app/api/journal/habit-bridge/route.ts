import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { loadJournalHabitFindings } from '@/lib/health/journal-habit-analysis-load';
import { buildTodayJournalHabitBridge } from '@/lib/health/journal-habit-today-bridge';
import { awaitRequest } from '@/lib/next/await-request';
import { prisma } from '@/lib/prisma';

/**
 * Lightweight Today callout for journal habit priority.
 * Returns `{ bridge: null }` when silent (not ready / no priority).
 */
export async function GET() {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const { daysWithSignal, findings } = await loadJournalHabitFindings(prisma, athleteId);
    const bridge = buildTodayJournalHabitBridge(findings, daysWithSignal);
    return NextResponse.json({ bridge });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger le pont journal' }, { status: 500 });
  }
}
