import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@sharpit/server/lib/cron/verify-cron-secret';
import { isApnsConfigured } from '@sharpit/server/lib/push/apns';
import { sendMorningVerdictPushes } from '@sharpit/server/lib/push/morning-push';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Morning push cron (06:45 UTC / Wake moment).
 * Delivers the morning verdict and briefing excerpt to all active athletes with iOS devices.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  if (!isApnsConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'APNS_NOT_CONFIGURED',
    });
  }

  try {
    const summary = await sendMorningVerdictPushes();
    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    console.error('[cron/morning-push]', error);
    return NextResponse.json({ error: 'Morning push failed' }, { status: 500 });
  }
}
