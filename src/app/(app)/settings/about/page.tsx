import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { MedicalDisclaimerNote } from '@/components/ui/instruments/medical-disclaimer-note';

export default function SettingsAboutPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref="/moi" fallbackLabel="Moi" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">À propos</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          SHARPIT est un système de coaching sportif personnel centré sur la physiologie et la
          décision du jour.
        </p>
      </StickyHeader>

      <section className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
        <div>
          <p className="text-label">Version</p>
          <p className="text-data mt-1 text-sm">0.1.0</p>
        </div>
        <div>
          <p className="text-label">Positionnement</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Athlete State Intelligence — exprimer l&apos;état de l&apos;athlète, pas un tableau de
            bord fitness. La journée commence par un verdict actionnable, pas par un inventaire de
            métriques.
          </p>
        </div>
        <div>
          <p className="text-label">Principes</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-1 pl-4 text-sm leading-relaxed">
            <li>La physiologie guide la recommandation du jour.</li>
            <li>Le Digital Twin reste la source de vérité — pas de moteurs parallèles.</li>
            <li>
              Les signaux sont sémantiques : récupération, caution, risque — jamais décoratifs.
            </li>
          </ul>
        </div>
        <div>
          <p className="text-label">Confidentialité</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            <a className="underline underline-offset-2" href="/privacy">
              Politique de confidentialité
            </a>
            {' · '}
            <a className="underline underline-offset-2" href="/terms">
              Conditions d&apos;utilisation
            </a>
            {' · '}
            <a className="underline underline-offset-2" href="/settings/privacy">
              Gérer mes consentements
            </a>
          </p>
        </div>
      </section>

      <section
        aria-labelledby="settings-about-confidentialite"
        className="analysis-panel-alt rounded-analysis-lg space-y-2 px-4 py-4"
      >
        <h2 className="text-label" id="settings-about-confidentialite">
          Confidentialité &amp; limite d&apos;usage
        </h2>
        <MedicalDisclaimerNote />
      </section>
    </div>
  );
}
