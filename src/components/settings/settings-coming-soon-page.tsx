import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { MOI_HUB_PATH } from '@/lib/moi/paths';

/** Shared chrome for Réglages destinations that are not wired yet. */
export function SettingsComingSoonPage({
  title,
  blurb,
  body,
}: {
  title: string;
  blurb: string;
  body: string;
}) {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Paramètres" showOnDesktop />
      <StickyHeader>
        <h1 className="text-page-title">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{blurb}</p>
      </StickyHeader>

      <section className="analysis-panel rounded-analysis-lg space-y-2 px-4 py-4">
        <p className="text-label">À venir</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
      </section>
    </div>
  );
}
