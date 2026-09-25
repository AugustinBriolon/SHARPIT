import type { Metadata } from 'next';
import { ConnectGarminAuthorize } from '@/components/integrations/connect-garmin/connect-garmin-authorize';

export const metadata: Metadata = { title: 'Autoriser Garmin · SHARPIT' };

export default function ConnectGarminAuthorizePage() {
  return <ConnectGarminAuthorize />;
}
