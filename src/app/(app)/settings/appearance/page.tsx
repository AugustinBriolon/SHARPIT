import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { AppearanceThemePicker } from '@/components/settings/appearance-theme-picker';

export default function SettingsAppearancePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Apparence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Choisis comment SHARPIT s&apos;affiche. Le mode Système suit la préférence de ton appareil
          en temps réel.
        </p>
      </StickyHeader>

      <AppearanceThemePicker />
    </div>
  );
}
