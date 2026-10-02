import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@sharpit/server/lib/cron/verify-cron-secret';
import { isApnsConfigured } from '@sharpit/server/lib/push/apns';
import { sendMorningVerdictPushes } from '@sharpit/server/lib/push/morning-push';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Morning push fallback (cron, late morning): the verdict for athletes whose night never reached
 * the server. Everyone else got it as soon as their night was read.
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
