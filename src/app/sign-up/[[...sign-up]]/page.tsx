import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/auth-shell';
import { authAppearance } from '@/lib/clerk-appearance';

export default function SignUpPage() {
  return (
    <AuthShell subtitle="Crée ton compte pour commencer avec SharpIt.">
      <SignUp appearance={authAppearance} />
    </AuthShell>
  );
}
