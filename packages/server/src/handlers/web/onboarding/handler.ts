import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { loadOnboarding } from '@sharpit/server/lib/web/onboarding';

export async function GET() {
  await awaitRequest();
  try {
    return NextResponse.json(await loadOnboarding(await getCurrentAthleteId()));
  } catch (error) {
    console.error('[api/web/onboarding]', { name: error instanceof Error ? error.name : 'Error' });
    return NextResponse.json({ error: 'Onboarding indisponible' }, { status: 500 });
  }
}
