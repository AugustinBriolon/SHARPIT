import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { AppearanceThemePicker } from '@/components/settings/appearance';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { isDemoSession } from '@/lib/demo/demo-session';
import { MOI_HUB_PATH, MOI_PERSONALIZATION_PATH } from '@/lib/moi/paths';
import Link from 'next/link';

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
    <div className="space-y-6">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Apparence</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Thème clair, sombre ou système. La densité de lecture est dans{' '}
          <Link className="underline underline-offset-2" href={MOI_PERSONALIZATION_PATH}>
            Personnalisation
          </Link>
          .
        </p>
      </StickyHeader>

      <Suspense fallback={<ThemePickerSkeleton />}>
        <ThemeSection />
      </Suspense>
    </div>
  );
}
