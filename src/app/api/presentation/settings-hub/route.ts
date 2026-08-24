import { NextResponse } from 'next/server';
import { getSettingsHubStatus } from '@/lib/settings/load-hub-status';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    // Returned unwrapped: HubStatusValue indexes the payload by status key directly.
    const status = await getSettingsHubStatus(athleteId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('[api/presentation/settings-hub]', error);
    return NextResponse.json(
      { error: 'Impossible de produire le statut des réglages' },
      { status: 500 },
    );
  }
}
