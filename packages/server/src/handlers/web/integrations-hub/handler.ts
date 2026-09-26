import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { loadIntegrationsHub } from '@sharpit/server/lib/web/integrations-hub';

export async function GET() {
  await awaitRequest();
  try {
    return NextResponse.json(await loadIntegrationsHub(await getCurrentAthleteId()));
  } catch (error) {
    console.error('[api/web/integrations-hub]', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.json({ error: 'Intégrations indisponibles' }, { status: 500 });
  }
}
