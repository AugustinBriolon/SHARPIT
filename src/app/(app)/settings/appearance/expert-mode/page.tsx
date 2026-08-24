import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { AppearanceDisplayModePicker } from '@/components/settings/appearance';

export default function SettingsExpertModePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink showOnDesktop />
      <StickyHeader>
        <p className="text-label">Apparence</p>
        <h1 className="text-page-title mt-1">Mode Expert</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Une seule bascule pour révéler ou masquer la couche technique derrière chaque lecture.
        </p>
      </StickyHeader>

      <AppearanceDisplayModePicker />

      <section className="analysis-panel rounded-analysis-lg space-y-3 px-4 py-4">
        <div>
          <p className="text-label">Ce que ça change</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Rien n&apos;est calculé différemment — le Digital Twin tourne exactement pareil, que tu
            sois en lecture essentielle ou experte. Seul l&apos;affichage change : les métriques
            techniques restent en retrait tant que tu ne les as pas demandées.
          </p>
        </div>
        <div>
          <p className="text-label">Ce que le mode Expert révèle, page par page</p>
          <ul className="text-muted-foreground mt-1 list-disc space-y-1.5 pl-4 text-sm leading-relaxed">
            <li>
              <span className="text-foreground font-medium">Activités</span> — TSS, IF, puissance
              normalisée, découplage cardiaque et les autres métriques dérivées du stream.
            </li>
            <li>
              <span className="text-foreground font-medium">Charge</span> — courbe PMC (CTL/ATL/TSB)
              et le détail de la charge chronique/aiguë.
            </li>
            <li>
              <span className="text-foreground font-medium">Progression</span> — courbe de puissance
              et les autres courbes de référence.
            </li>
            <li>
              <span className="text-foreground font-medium">Calibration</span> — dans Progression,
              tes seuils bruts (FTP, allure seuil, FC seuil…) et leur historique. Seule exception à
              la règle « rien ne change que l&apos;affichage » : cette section entière n&apos;existe
              qu&apos;en mode Expert, un seuil n&apos;ayant aucun sens sans les métriques qu&apos;il
              calibre.
            </li>
          </ul>
        </div>
        <div>
          <p className="text-label">Sur quelles pages tu verras l&apos;indicateur</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Un badge « Mode Expert » apparaît en haut de chaque page listée ci-dessus dès que la
            bascule est activée, pour ne jamais te laisser deviner pourquoi une lecture est plus
            dense que d&apos;habitude. Il ramène ici en un tap.
          </p>
        </div>
      </section>
    </div>
  );
}
