import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { isDemoSession } from '@sharpit/server/lib/demo/demo-session';
import { awaitRequest } from '@sharpit/server/lib/next/await-request';
import { loadDemoCoachTranscript } from '@sharpit/server/lib/web/demo-coach-transcript';

/** The demo account's seeded coach conversation; 404 for anyone else or when there is none. */
export async function GET() {
  await awaitRequest();
  if (!(await isDemoSession())) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  const transcript = await loadDemoCoachTranscript(await getCurrentAthleteId());
  return transcript
    ? NextResponse.json(transcript)
    : NextResponse.json({ error: 'Introuvable' }, { status: 404 });
}
