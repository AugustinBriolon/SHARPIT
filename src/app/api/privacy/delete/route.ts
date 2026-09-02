import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { awaitRequest } from '@/lib/next/await-request';
import { softDeleteAthlete } from '@/lib/privacy/account-deletion';
import { PRIVACY_PURGE_DELAY_DAYS } from '@/lib/privacy/constants';
import { logSafeError } from '@/lib/privacy/safe-log';

/** Soft-delete now; hard purge via /api/cron/privacy-purge at J+30. */
export async function POST() {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const result = await softDeleteAthlete(athleteId);
    return NextResponse.json({
      ok: true,
      deletedAt: result.deletedAt.toISOString(),
      purgeAfter: result.purgeAfter.toISOString(),
      purgeDelayDays: PRIVACY_PURGE_DELAY_DAYS,
      message:
        'Compte désactivé. Les données seront purgées définitivement sous 30 jours.',
    });
  } catch (error) {
    logSafeError('privacy/delete POST', error);
    return NextResponse.json({ error: 'Impossible de supprimer le compte' }, { status: 500 });
  }
}
