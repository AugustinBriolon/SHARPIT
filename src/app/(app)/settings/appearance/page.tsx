import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import {
  AppearanceDisplayModePicker,
  AppearanceThemePicker,
} from '@/components/settings/appearance';

export default function SettingsAppearancePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Apparence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Choisis comment SHARPIT s&apos;affiche. Le mode Système suit la préférence de ton appareil
          en temps réel.
        </p>
      </StickyHeader>

      <section className="space-y-3">
        <div>
          <h2 className="text-section-title">Thème</h2>
        </div>
        <AppearanceThemePicker />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-section-title">Densité de lecture</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Choisis la profondeur des données affichées. Le mode Expert révèle la couche technique
            derrière chaque lecture ; il ne change rien à ce que SHARPIT calcule.
          </p>
        </div>
        <AppearanceDisplayModePicker />
      </section>
    </div>
  );
}
