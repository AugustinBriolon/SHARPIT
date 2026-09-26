import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/server/lib/next/await-request';
import { loadWebViewer } from '@sharpit/server/lib/web/viewer';

/** The signed-in visitor's routing context for the web shell (`WebViewer`). */
export async function GET() {
  await awaitRequest();
  try {
    return NextResponse.json(await loadWebViewer(await getCurrentAthleteId()));
  } catch (error) {
    console.error('[api/web/viewer]', { name: error instanceof Error ? error.name : 'Error' });
    return NextResponse.json({ error: 'Contexte indisponible' }, { status: 500 });
  }
}
