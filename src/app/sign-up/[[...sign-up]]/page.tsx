import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignUpGateForm } from './sign-up-gate-form';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import {
  INVITE_COOKIE,
  isInviteCodeValid,
  isSignupGateEnabled,
  signupEmailsConfigured,
  signupInviteCodesConfigured,
} from '@/lib/auth/signup-gate';

function resolveSignUpGateState(inviteAccepted: boolean) {
  const gateEnabled = isSignupGateEnabled();
  const hasInvites = signupInviteCodesConfigured();
  const hasEmails = signupEmailsConfigured();

  // Invite codes alone → must redeem before the Clerk widget.
  // Email allowlist → show SignUp; provisioning still enforces email OR invite.
  // Gate on with empty lists → closed surface (no Clerk widget).
  return {
    gateEnabled,
    inviteAccepted,
    inviteRequired: gateEnabled && hasInvites && !hasEmails,
    completelyClosed: gateEnabled && !hasInvites && !hasEmails,
    showClerkSignUp: !gateEnabled || inviteAccepted || hasEmails,
  };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; invite_error?: string }>;
}) {
  if (isDevClerkBypass()) {
    redirect('/');
  }

  const params = await searchParams;

  // Query-string invites must go through the cookie-setting route — Server
  // Components cannot set cookies during render.
  if (params.invite && isInviteCodeValid(params.invite)) {
    redirect(`/api/invite/redeem?code=${encodeURIComponent(params.invite)}`);
  }

  const store = await cookies();
  const inviteAccepted = isInviteCodeValid(store.get(INVITE_COOKIE)?.value ?? null);
  const state = resolveSignUpGateState(inviteAccepted);

  return <SignUpGateForm {...state} inviteError={params.invite_error === '1'} />;
}
