import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConnectGarminAuthorize } from '@/components/integrations/connect-garmin/connect-garmin-authorize';

export const metadata: Metadata = { title: 'Autoriser Garmin · SHARPIT' };

type PageProps = {
  searchParams: Promise<{ state?: string }>;
};

/** The signed connect state rides in the URL; the ticket exchange sends it back. */
async function Authorize({ searchParams }: PageProps) {
  const { state } = await searchParams;
  return <ConnectGarminAuthorize state={state ?? ''} />;
}

export default function ConnectGarminAuthorizePage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <Authorize searchParams={searchParams} />
    </Suspense>
  );
}
