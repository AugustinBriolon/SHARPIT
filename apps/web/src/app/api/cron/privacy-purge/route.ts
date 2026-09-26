import { NextResponse } from 'next/server';
import { purgeSoftDeletedAthletes } from '@sharpit/server/lib/privacy/account-deletion';
import { verifyCronSecret } from '@sharpit/server/lib/cron/verify-cron-secret';
import { logSafeError } from '@sharpit/server/lib/privacy/safe-log';

export const maxDuration = 60;

/**
 * Finishes any account deletion still pending (see `purgeSoftDeletedAthletes`).
 * Scheduled in vercel.json — Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await purgeSoftDeletedAthletes();
    return NextResponse.json({
      ok: true,
      purgedCount: result.purged.length,
      // ids only — never profile metrics
      purgedAthleteIds: result.purged,
    });
  } catch (error) {
    logSafeError('cron/privacy-purge', error);
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 });
  }
}
