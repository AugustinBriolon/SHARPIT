import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { AppearanceThemePicker } from '@/components/settings/appearance';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { isDemoSession } from '@/lib/demo/demo-session';

function ThemePickerSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" aria-busy />;
}

async function ThemeSection() {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="Le thème est une préférence de compte réel. Désactivé sur le compte démo partagé." />
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-section-title">Thème</h2>
      </div>
      <AppearanceThemePicker />
    </section>
  );
}

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

      {/* Header above is static and prerenders; only the demo check waits. */}
      <Suspense fallback={<ThemePickerSkeleton />}>
        <ThemeSection />
      </Suspense>
    </div>
  );
}
