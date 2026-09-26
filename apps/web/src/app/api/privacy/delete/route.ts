import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/server/lib/next/await-request';
import { deleteAthleteAccount } from '@sharpit/server/lib/privacy/account-deletion';
import { logSafeError } from '@sharpit/server/lib/privacy/safe-log';

/** Deletes the account now — data and sign-in identity. The client signs out next. */
export async function POST() {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const result = await deleteAthleteAccount(athleteId);
    return NextResponse.json({
      ok: true,
      deletedAt: result.deletedAt.toISOString(),
      message: 'Compte supprimé définitivement.',
    });
  } catch (error) {
    logSafeError('privacy/delete POST', error);
    return NextResponse.json({ error: 'Impossible de supprimer le compte' }, { status: 500 });
  }
}
