import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Brain,
  Dumbbell,
  Gauge,
  HeartPulse,
  Link2,
  Lock,
  Microscope,
  MoonStar,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  User2,
  Wrench,
} from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { InstallCard } from '@/components/pwa/install-card';
import { ShellHubLink } from '@/components/shell/shell-hub-link';
import { HubStatusValue } from '@/components/settings/hub-status-value';
import {
  SettingsAppearanceStatus,
  SettingsExpertModeStatus,
} from '@/components/settings/settings-appearance-status';
import { SettingsAdminEntry } from '@/components/settings/settings-admin-entry';
import { SettingsHomeExtras } from '@/components/settings/settings-home-extras';
import { SettingsSignOut } from '@/components/settings/settings-sign-out';
import type { SettingsEntry } from '@/components/settings/settings-home';
import {
  MOI_CALIBRATION_PATH,
  MOI_CORPS_PATH,
  MOI_OBJECTIFS_PATH,
  MOI_PRIVACY_PATH,
} from '@/lib/moi/paths';

type HubSection = {
  id: string;
  title: string;
  blurb?: string;
  entries: Array<
    SettingsEntry & {
      meta?: ReactNode;
    }
  >;
};

/**
 * Moi hub IA — order Augustin expects:
 * Essentiel → Compte → Équipement → Apps connectées → Apparence → Autre.
 * Every page entry uses the Destination card row (ShellHubLink), not text links.
 */
const SECTIONS: HubSection[] = [
  {
    id: 'essentiel',
    title: 'Essentiel',
    blurb: 'Le modèle athlète : corps, cibles et données personnelles.',
    entries: [
      {
        href: MOI_CORPS_PATH,
        title: 'Corps',
        description: 'Composition, suivi physique et contraintes de santé.',
        icon: HeartPulse,
      },
      {
        href: MOI_OBJECTIFS_PATH,
        title: 'Objectifs',
        description: 'Courses, métriques prioritaires et proximité aux cibles.',
        icon: Target,
      },
      {
        href: MOI_CALIBRATION_PATH,
        title: 'Seuils & repères',
        description: 'FTP, allure seuil, FC max — la règle graduée de ta charge.',
        icon: SlidersHorizontal,
      },
      {
        href: MOI_PRIVACY_PATH,
        title: 'Confidentialité',
        description: 'Consentements, export et suppression du compte.',
        icon: Lock,
      },
    ],
  },
  {
    id: 'compte',
    title: 'Compte',
    entries: [
      {
        href: '/settings/account',
        title: 'Compte',
        description: 'Identité, sommeil et paramètres personnels.',
        icon: User2,
        meta: <HubStatusValue statusKey="account" />,
      },
    ],
  },
  {
    id: 'equipment',
    title: 'Équipement',
    entries: [
      {
        href: '/settings/equipment',
        title: 'Équipement',
        description: 'Sports pratiqués et matériel disponible.',
        icon: Dumbbell,
        meta: <HubStatusValue statusKey="equipment" />,
      },
    ],
  },
  {
    id: 'apps',
    title: 'Apps connectées',
    entries: [
      {
        href: '/settings/integrations',
        title: 'Applications connectées',
        description: 'Sources de données et synchronisations.',
        icon: Link2,
        meta: <HubStatusValue statusKey="integrations" />,
      },
    ],
  },
  {
    id: 'apparence',
    title: 'Apparence',
    entries: [
      {
        href: '/settings/appearance',
        title: 'Apparence',
        description: 'Thème clair, sombre ou système.',
        icon: MoonStar,
        meta: <SettingsAppearanceStatus />,
      },
      {
        href: '/settings/appearance/expert-mode',
        title: 'Mode Expert',
        description: 'Densité de lecture : révèle ou masque la couche technique.',
        icon: Microscope,
        meta: <SettingsExpertModeStatus />,
      },
    ],
  },
  {
    id: 'autre',
    title: 'Autre',
    entries: [
      {
        href: '/settings/memory',
        title: 'Mémoire du coach',
        description: 'Préférences durables et contraintes datées.',
        icon: Brain,
        meta: <HubStatusValue statusKey="memory" />,
      },
      {
        href: '/settings/pro',
        title: 'Pro',
        description: 'Ce que le palier payant débloque.',
        icon: Gauge,
      },
      {
        href: '/settings/about',
        title: 'À propos',
        description: 'Version, principes et limite d’usage.',
        icon: ShieldCheck,
        meta: <HubStatusValue statusKey="about" />,
      },
    ],
  },
];

/**
 * Moi hub — Shell V1.1 destinations (not an Accès link dump).
 *
 * Grouped IA: Essentiel · Compte · Équipement · Apps · Apparence · Autre.
 * Dedicated child pages own their content.
 */
export function MoiHub() {
  return (
    <div className="space-y-6 max-lg:pb-16">
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Ton modèle, tes données</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Corps, objectifs et confidentialité, puis le compte et le reste.
        </p>
      </StickyHeader>

      <div className="space-y-7">
        <MoiHubSections />
        <Suspense fallback={null}>
          <SettingsAdminEntry />
        </Suspense>
      </div>

      <MoiMaintenancePanel />

      <Suspense>
        <InstallCard />
      </Suspense>

      <Suspense>
        <SettingsSignOut />
      </Suspense>
    </div>
  );
}

function MoiHubSections() {
  return (
    <>
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`moi-section-${section.id}`}
          className="space-y-3"
        >
          <div>
            <h2 className="text-section-title" id={`moi-section-${section.id}`}>
              {section.title}
            </h2>
            {section.blurb ? (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{section.blurb}</p>
            ) : null}
          </div>
          <ul className="space-y-2">
            {section.entries.map((entry) => (
              <ShellHubLink
                key={entry.href}
                description={entry.description}
                href={entry.href}
                icon={entry.icon}
                meta={entry.meta}
                title={entry.title}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function MoiMaintenancePanel() {
  return (
    <section
      aria-labelledby="moi-maintenance"
      className="analysis-panel-alt rounded-analysis-lg p-4"
    >
      <div className="flex items-start gap-3">
        <div className="icon-well size-9" aria-hidden>
          <Wrench className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium" id="moi-maintenance">
            Maintenance
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Outils locaux (cache et rechargement), aussi via{' '}
            <Link
              className="text-foreground underline-offset-2 hover:underline"
              href="/settings/maintenance"
            >
              la page Maintenance
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="mt-4">
        <SettingsHomeExtras />
      </div>
    </section>
  );
}
