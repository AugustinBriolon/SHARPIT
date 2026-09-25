import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/verify-cron-secret';
import { buildOpsSmokeReport } from '@/lib/ops/ops-smoke';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Ops smoke for secrets / cron readiness.
 * `Authorization: Bearer $CRON_SECRET` required.
 * Never returns secret values — only configured/missing/ok/failed statuses.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return unauthorized();
  }

  const report = buildOpsSmokeReport();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
