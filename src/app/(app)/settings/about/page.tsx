import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';

export default function SettingsAboutPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">À propos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          SHARPIT est un système de coaching sportif personnel centré sur la physiologie et la
          décision du jour.
        </p>
      </StickyHeader>

      <section className="analysis-panel rounded-analysis-lg px-4 py-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cet espace regroupera la version de l’application, les principes produit et les
          informations système utiles au support et à la maintenance.
        </p>
      </section>
    </div>
  );
}
