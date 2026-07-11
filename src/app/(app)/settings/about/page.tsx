import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';

export default function SettingsAboutPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">À propos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          SHARPIT est un système de coaching sportif personnel centré sur la physiologie et la
          décision du jour.
        </p>
      </StickyHeader>

      <section className="rounded-2xl border px-4 py-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Cet espace regroupera la version de l’application, les principes produit et les
          informations système utiles au support et à la maintenance.
        </p>
      </section>
    </div>
  );
}
