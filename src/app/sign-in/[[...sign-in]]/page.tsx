import { SignIn } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { authAppearance } from '@/lib/theme/clerk-appearance';
import { buttonVariants } from '@/components/ui/button';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { cn } from '@/lib/utils';

function DemoCallout() {
  return (
    <div className="analysis-panel rounded-analysis-lg flex flex-col items-center gap-3 px-5 py-5 text-center dark:border-foreground/20">
      <p className="text-label text-foreground/70">Sans inscription</p>
      <p className="text-foreground text-sm leading-relaxed">
        Explore SharpIt avec des données réalistes, en lecture seule.
      </p>
      <a
        href="/demo"
        className={cn(
          buttonVariants({ variant: 'accent', size: 'lg' }),
          'w-full motion-safe:duration-150 motion-safe:ease-out motion-safe:active:not-disabled:scale-[0.96]',
        )}
      >
        Essayer la démo
      </a>
    </div>
  );
}

function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="bg-border dark:bg-foreground/25 h-px flex-1" />
      <span className="text-foreground/70 text-xs tracking-wider uppercase">
        ou connecte-toi
      </span>
      <span className="bg-border dark:bg-foreground/25 h-px flex-1" />
    </div>
  );
}

export default function SignInPage() {
  if (isDevClerkBypass()) {
    redirect('/');
  }
  return (
    <AuthShell
      beforeForm={
        <div className="flex flex-col gap-5">
          <DemoCallout />
          <AuthDivider />
        </div>
      }
    >
      <SignIn appearance={authAppearance} />
    </AuthShell>
  );
}
