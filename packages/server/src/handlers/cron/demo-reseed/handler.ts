import { NextResponse } from 'next/server';
import { prisma } from '@sharpit/db/client';
import { seedDemoAthlete } from '@sharpit/server/lib/demo/seed-demo-data';
import { verifyCronSecret } from '@sharpit/server/lib/cron/verify-cron-secret';

/** Keeps the public demo's "last 3 weeks" genuinely relative to today — every
 * date in seedDemoAthlete() is computed at run time, so a daily rerun is what
 * actually prevents the demo from going stale (see ADR-026). */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedDemoAthlete(prisma);

  return NextResponse.json({ ok: true });
}
