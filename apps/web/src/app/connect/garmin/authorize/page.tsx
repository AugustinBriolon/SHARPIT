import type { Metadata } from 'next';
import { ConnectGarminAuthorize } from '@/components/integrations/connect-garmin/connect-garmin-authorize';

export const metadata: Metadata = { title: 'Autoriser Garmin · SHARPIT' };

type PageProps = {
  searchParams: Promise<{ state?: string }>;
};

export default async function ConnectGarminAuthorizePage({ searchParams }: PageProps) {
  const { state } = await searchParams;
  return <ConnectGarminAuthorize state={state ?? ''} />;
}
