import Link from 'next/link';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PersonalProfilePanel, type ProfileData } from '@/components/settings/profile';

export function ProfileView({ initial }: { initial: ProfileData | null }) {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Mon profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Identité et rythme de vie — les repères de performance sont dans Progression.
        </p>
      </StickyHeader>

      <PersonalProfilePanel initial={initial} />
    </div>
  );
}
