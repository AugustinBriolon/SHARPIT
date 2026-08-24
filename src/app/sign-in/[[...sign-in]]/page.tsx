import { SignIn } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { authAppearance } from '@/lib/theme/clerk-appearance';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';

export default function SignInPage() {
  if (isDevClerkBypass()) redirect('/');
  return (
    <AuthShell>
      <SignIn appearance={authAppearance} />
      <p className="text-muted-foreground mt-4 text-center text-sm">
        <a className="text-foreground underline underline-offset-2" href="/demo">
          Voir une démo — sans inscription
        </a>
      </p>
    </AuthShell>
  );
}
