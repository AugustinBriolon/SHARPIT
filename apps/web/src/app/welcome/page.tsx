import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountDeletedNotice } from '@/components/teaser/account-deleted-notice';
import { TeaserFunnel } from '@/components/teaser/teaser-funnel';

export const metadata: Metadata = {
  title: 'SHARPIT',
  description: 'Coach d’endurance avec Digital Twin. Décide le matin, avance le reste du jour.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function WelcomePage() {
  return (
    <>
      {/* Reads the query string only — the teaser itself stays prerendered. */}
      <Suspense>
        <AccountDeletedNotice />
      </Suspense>
      <TeaserFunnel />
    </>
  );
}
