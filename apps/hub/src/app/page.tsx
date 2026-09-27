import type { Metadata } from 'next';
import { Landing } from '@/components/landing/landing';

export const metadata: Metadata = {
  title: 'SHARPIT · Coach d’endurance',
  description:
    'Décider le matin, avancer le reste du jour. SHARPIT lit ton entraînement et te donne une décision claire chaque matin.',
  alternates: { canonical: 'https://sharpit.app' },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return <Landing />;
}
