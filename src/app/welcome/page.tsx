import type { Metadata } from 'next';
import { TeaserFunnel } from '@/components/teaser/teaser-funnel';

export const metadata: Metadata = {
  title: 'SHARPIT',
  description:
    'Coach d’endurance avec Digital Twin. Décide le matin, avance le reste du jour.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function WelcomePage() {
  return <TeaserFunnel />;
}
