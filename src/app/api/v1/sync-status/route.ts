import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { projectV1SyncStatus } from '@/lib/presentation/v1/sync-status';
import { connectedProviderSet, loadAthleteSyncContext } from '@/lib/sync/athlete-provider-sync';

/** When each connected provider was last pulled, so the native app knows whether to sync. */
export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const { accounts } = await loadAthleteSyncContext(athleteId);
    return NextResponse.json(projectV1SyncStatus(accounts, connectedProviderSet(accounts)));
  } catch (error) {
    console.error('[api/v1/sync-status]', error);
    return NextResponse.json({ error: 'Statut de synchronisation indisponible' }, { status: 500 });
  }
}
