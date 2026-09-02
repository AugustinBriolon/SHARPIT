'use server';

import { cookies } from 'next/headers';
import {
  INVITE_COOKIE,
  isInviteCodeValid,
  normalizeInviteCode,
  signupGateClosedCopy,
} from '@/lib/auth/signup-gate';

export async function redeemInviteCode(
  rawCode: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = normalizeInviteCode(rawCode);
  const copy = signupGateClosedCopy();
  if (!code || !isInviteCodeValid(code)) {
    return { ok: false, error: copy.inviteInvalid };
  }

  const store = await cookies();
  store.set(INVITE_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return { ok: true };
}
