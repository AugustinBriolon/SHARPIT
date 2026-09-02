import { timingSafeEqualString } from '@/lib/crypto/timing-safe-equal';

/**
 * Private-circle signup gate (V0 trust).
 *
 * Defense in depth alongside Clerk Dashboard restrictions (Allowlist /
 * Invitations). Existing `AthleteProfile` rows are never blocked — only
 * lazy provisioning of brand-new Clerk users.
 *
 * Enable with `SIGNUP_GATE_ENABLED=true`, or implicitly by setting
 * `SIGNUP_ALLOWED_EMAILS` / `SIGNUP_INVITE_CODES`. When enabled with empty
 * lists, new accounts are rejected (fail-closed for commercialization).
 */

export const INVITE_COOKIE = 'sharpit_invite';

function parseList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function signupEmails(): string[] {
  return parseList(process.env.SIGNUP_ALLOWED_EMAILS);
}

function signupInviteCodes(): string[] {
  return parseList(process.env.SIGNUP_INVITE_CODES);
}

export function signupEmailsConfigured(): boolean {
  return signupEmails().length > 0;
}

export function signupInviteCodesConfigured(): boolean {
  return signupInviteCodes().length > 0;
}

export function isSignupGateEnabled(): boolean {
  if (process.env.SIGNUP_GATE_ENABLED === 'true') {
    return true;
  }
  return signupEmailsConfigured() || signupInviteCodesConfigured();
}

export function normalizeInviteCode(code: string | null | undefined): string {
  return (code ?? '').trim().toLowerCase();
}

export function isSignupEmailAllowed(email: string | null | undefined): boolean {
  const normalized = (email ?? '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return signupEmails().includes(normalized);
}

export function isInviteCodeValid(code: string | null | undefined): boolean {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    return false;
  }
  return signupInviteCodes().some((allowed) => timingSafeEqualString(normalized, allowed));
}

export function canProvisionNewAthlete(input: {
  email: string | null | undefined;
  inviteCode: string | null | undefined;
}): boolean {
  if (!isSignupGateEnabled()) {
    return true;
  }
  if (isSignupEmailAllowed(input.email)) {
    return true;
  }
  if (isInviteCodeValid(input.inviteCode)) {
    return true;
  }
  return false;
}

/** French UI copy for blocked signup / access-denied surfaces. */
export function signupGateClosedCopy() {
  return {
    title: 'Inscription sur invitation',
    body: 'SharpIt est en cercle privé. Seules les personnes autorisées peuvent créer un compte. Demande une invitation, ou explore la démo en lecture seule.',
    ctaDemo: 'Essayer la démo',
    ctaSignIn: 'J’ai déjà un compte',
    invitePrompt: 'Code d’invitation',
    inviteSubmit: 'Continuer',
    inviteInvalid: 'Code d’invitation invalide.',
    inviteRequired: 'Un code d’invitation est requis pour créer un compte.',
  } as const;
}

export class SignupForbiddenError extends Error {
  constructor(message = 'Signup forbidden by private-circle gate') {
    super(message);
    this.name = 'SignupForbiddenError';
  }
}

export function isSignupForbiddenError(error: unknown): error is SignupForbiddenError {
  return error instanceof SignupForbiddenError;
}
