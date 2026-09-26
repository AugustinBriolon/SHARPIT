import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { loadJournalAnalyses } from '@sharpit/server/lib/web/journal-analyses';

/** The web journal analyses screen (`JournalAnalysesPayload`). */
export async function GET() {
  await awaitRequest();
  try {
    return NextResponse.json(await loadJournalAnalyses(await getCurrentAthleteId()));
  } catch (error) {
    console.error('[api/web/journal-analyses]', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.json({ error: 'Analyses indisponibles' }, { status: 500 });
  }
}
