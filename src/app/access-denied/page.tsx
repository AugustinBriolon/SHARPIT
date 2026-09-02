'use client';

import { SignOutButton } from '@clerk/nextjs';
import { Activity } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { signupGateClosedCopy } from '@/lib/auth/signup-gate';
import { cn } from '@/lib/utils';

export function AccessDeniedView() {
  const copy = signupGateClosedCopy();

  return (
    <div className="auth-surface bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="icon-well size-12" aria-hidden>
            <Activity className="size-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-page-title">SharpIt</h1>
            <p className="text-foreground mt-3 text-base font-medium">{copy.title}</p>
            <p className="text-auth-muted mt-2 text-sm leading-relaxed">{copy.body}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <a
            className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'w-full')}
            href="/demo"
          >
            {copy.ctaDemo}
          </a>
          <SignOutButton redirectUrl="/sign-in">
            <Button className="w-full" type="button" variant="outline">
              Se déconnecter
            </Button>
          </SignOutButton>
          <a
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full')}
            href="/sign-in"
          >
            {copy.ctaSignIn}
          </a>
        </div>
      </div>
    </div>
  );
}
