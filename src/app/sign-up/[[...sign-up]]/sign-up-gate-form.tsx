'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { authAppearance } from '@/lib/theme/clerk-appearance';
import { signupGateClosedCopy } from '@/lib/auth/signup-gate';
import { cn } from '@/lib/utils';
import { redeemInviteCode } from './actions';

type GateCopy = ReturnType<typeof signupGateClosedCopy>;

function DemoAndSignInLinks({ copy }: { copy: GateCopy }) {
  return (
    <>
      <a
        className="text-auth-muted text-center text-sm underline-offset-4 hover:underline"
        href="/demo"
      >
        {copy.ctaDemo}
      </a>
      <a
        className="text-auth-muted text-center text-sm underline-offset-4 hover:underline"
        href="/sign-in"
      >
        {copy.ctaSignIn}
      </a>
    </>
  );
}

function ClosedSignupPanel({ copy }: { copy: GateCopy }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-auth-muted text-sm leading-relaxed">{copy.body}</p>
      <a className={cn(buttonVariants({ size: 'lg', variant: 'accent' }), 'w-full')} href="/demo">
        {copy.ctaDemo}
      </a>
      <a
        className="text-auth-muted text-center text-sm underline-offset-4 hover:underline"
        href="/sign-in"
      >
        {copy.ctaSignIn}
      </a>
    </div>
  );
}

function InviteCodeForm({
  copy,
  error,
  pending,
  onSubmit,
}: {
  copy: GateCopy;
  error: string | null;
  pending: boolean;
  onSubmit: (code: string) => void;
}) {
  return (
    <form
      className="flex w-full flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const code = new FormData(event.currentTarget).get('invite')?.toString() ?? '';
        onSubmit(code);
      }}
    >
      <p className="text-auth-muted text-sm leading-relaxed">{copy.body}</p>
      <label className="flex flex-col gap-2 text-left">
        <span className="text-label text-auth-muted">{copy.invitePrompt}</span>
        <input
          autoComplete="off"
          className="border-auth-panel bg-background text-foreground rounded-analysis-lg border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          name="invite"
          placeholder="ton-code"
          spellCheck={false}
          type="text"
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="w-full" disabled={pending} size="lg" type="submit" variant="accent">
        {copy.inviteSubmit}
      </Button>
      <DemoAndSignInLinks copy={copy} />
    </form>
  );
}

function OpenSignupPanel({ copy, inviteAccepted }: { copy: GateCopy; inviteAccepted: boolean }) {
  return (
    <AuthShell subtitle={inviteAccepted ? 'Code accepté — crée ton compte.' : copy.title}>
      <div className="flex w-full flex-col gap-4">
        <p className="text-auth-muted text-sm leading-relaxed">{copy.body}</p>
        <SignUp appearance={authAppearance} />
        <a
          className="text-auth-muted text-center text-sm underline-offset-4 hover:underline"
          href="/demo"
        >
          {copy.ctaDemo}
        </a>
      </div>
    </AuthShell>
  );
}

function InviteOnlySurface({ copy, inviteError }: { copy: GateCopy; inviteError: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(inviteError ? copy.inviteInvalid : null);
  const [pending, startTransition] = useTransition();
  return (
    <AuthShell subtitle={copy.title}>
      <InviteCodeForm
        copy={copy}
        error={error}
        pending={pending}
        onSubmit={(code) => {
          setError(null);
          startTransition(async () => {
            const result = await redeemInviteCode(code);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      />
    </AuthShell>
  );
}

function GatedSignupSurface(props: {
  completelyClosed: boolean;
  inviteRequired: boolean;
  inviteAccepted: boolean;
  showClerkSignUp: boolean;
  inviteError: boolean;
}) {
  const copy = signupGateClosedCopy();
  if (props.completelyClosed) {
    return (
      <AuthShell subtitle={copy.title}>
        <ClosedSignupPanel copy={copy} />
      </AuthShell>
    );
  }
  if (props.inviteRequired && !props.inviteAccepted) {
    return <InviteOnlySurface copy={copy} inviteError={props.inviteError} />;
  }
  if (!props.showClerkSignUp) {
    return (
      <AuthShell subtitle={copy.title}>
        <p className="text-auth-muted text-sm leading-relaxed">{copy.body}</p>
      </AuthShell>
    );
  }
  return <OpenSignupPanel copy={copy} inviteAccepted={props.inviteAccepted} />;
}

export function SignUpGateForm({
  gateEnabled,
  inviteRequired,
  inviteAccepted,
  inviteError = false,
  completelyClosed = false,
  showClerkSignUp = false,
}: {
  gateEnabled: boolean;
  inviteRequired: boolean;
  inviteAccepted: boolean;
  inviteError?: boolean;
  completelyClosed?: boolean;
  showClerkSignUp?: boolean;
}) {
  if (!gateEnabled) {
    return (
      <AuthShell subtitle="Crée ton compte pour commencer avec SharpIt.">
        <SignUp appearance={authAppearance} />
      </AuthShell>
    );
  }

  return (
    <GatedSignupSurface
      completelyClosed={completelyClosed}
      inviteAccepted={inviteAccepted}
      inviteError={inviteError}
      inviteRequired={inviteRequired}
      showClerkSignUp={showClerkSignUp}
    />
  );
}
