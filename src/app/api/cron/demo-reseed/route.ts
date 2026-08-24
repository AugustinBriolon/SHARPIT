import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { seedDemoAthlete } from '@/lib/demo/seed-demo-data';

export const maxDuration = 60;

/** Keeps the public demo's "last 3 weeks" genuinely relative to today — every
 * date in seedDemoAthlete() is computed at run time, so a daily rerun is what
 * actually prevents the demo from going stale (see ADR-026). */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedDemoAthlete(prisma);

  return NextResponse.json({ ok: true });
}
