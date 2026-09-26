import { SignIn } from '@clerk/nextjs';
import { authAppearance } from '@sharpit/app/lib/theme/clerk-appearance';
import { AuthShell } from '@sharpit/ui/components/auth/auth-shell';

/**
 * The apex sign-in: where the native Garmin handoff redeems its one-time ticket
 * (`__clerk_ticket`, ADR-047) and where a stranger opening `/connect/garmin` signs in before
 * coming back. Everyday sign-in lives on the web app.
 */
export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn appearance={authAppearance} />
    </AuthShell>
  );
}
