import { NextResponse } from 'next/server';
import { purgeSoftDeletedAthletes } from '@/lib/privacy/account-deletion';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';
import { logSafeError } from '@/lib/privacy/safe-log';

export const maxDuration = 60;

/**
 * Hard-purges soft-deleted athlete profiles after PRIVACY_PURGE_DELAY_DAYS (30).
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
