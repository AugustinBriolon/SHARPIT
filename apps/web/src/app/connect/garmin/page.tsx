import type { Metadata } from 'next';
import { ConnectGarminIntro } from '@/components/integrations/connect-garmin/connect-garmin-intro';

export const metadata: Metadata = { title: 'Connecter Garmin · SHARPIT' };

/**
 * Native Garmin handoff, step 1 (ADR-040, direction A). iOS opens this absolute URL on
 * `NEXT_PUBLIC_APP_URL` in an ASWebAuthenticationSession — the Today empty state and Moi
 * share it. The web only carries the OAuth step; it is not a Connections hub.
 */
export default function ConnectGarminPage() {
  return <ConnectGarminIntro />;
}
