import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConnectGarminOutcome } from '@/components/integrations/connect-garmin/connect-garmin-outcome';
import { parseGarminHandoffStatus } from '@/lib/integrations/garmin/garmin-connect-handoff';

export const metadata: Metadata = { title: 'Garmin · SHARPIT' };

type PageProps = {
  searchParams: Promise<{ garmin?: string }>;
};

async function Outcome({ searchParams }: PageProps) {
  const { garmin } = await searchParams;
  return <ConnectGarminOutcome status={parseGarminHandoffStatus(garmin)} />;
}

/**
 * Native Garmin handoff, last step — the Associated Domains URL that ends the iOS
 * ASWebAuthenticationSession (`?garmin=<status>` carries the outcome). Reads nothing
 * but its query string, so it is public: an expired session still sees a clear end.
 */
export default function ConnectGarminCallbackPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <Outcome searchParams={searchParams} />
    </Suspense>
  );
}
