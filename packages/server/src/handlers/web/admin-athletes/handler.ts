import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@sharpit/server/lib/auth/admin';
import { awaitRequest } from '@sharpit/server/lib/next/await-request';
import { loadAdminAthletes } from '@sharpit/server/lib/web/admin-athletes';

/** The /admin athlete list — 404 for anyone but an admin, like the tier toggle. */
export async function GET() {
  await awaitRequest();
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }
  return NextResponse.json(await loadAdminAthletes());
}
