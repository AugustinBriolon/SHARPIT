import { Suspense } from 'react';
import Link from 'next/link';
import {
  Brain,
  Dumbbell,
  Gauge,
  Link2,
  Lock,
  Microscope,
  MoonStar,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  User2,
  Wrench,
  HeartPulse,
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
import {
  SettingsEntryRow,
  type SettingsEntry,
} from '@/components/settings/settings-home';
import type { SettingsHubStatus } from '@/lib/settings/hub-status';

type SettingsGroup = {
  id: string;
  title: string;
  blurb: string;
  entries: SettingsEntry[];
};

/** Featured athlete model — Corps / objectifs / Confidentialité stay unburied. */
const FEATURED: SettingsEntry[] = [
  {
    href: '/progress?tab=body',
    title: 'Corps',
    description: 'Composition, suivi physique et contraintes de santé.',
    icon: HeartPulse,
  },
  {
    href: '/progress?tab=goals',
    title: 'Objectifs',
    description: 'Courses, métriques prioritaires et proximité aux cibles.',
    icon: Target,
  },
  {
    href: '/settings/privacy',
    title: 'Confidentialité',
    description: 'Consentements, export et suppression du compte.',
    icon: Lock,
  },
];

const GROUPS: SettingsGroup[] = [
  {
    id: 'athlete',
    title: 'Athlète',
    blurb: 'Identité, matériel et seuils: ce que le Twin sait de toi.',
    entries: [
      {
        href: '/settings/account',
        title: 'Compte',
        description: 'Identité, sommeil et paramètres personnels.',
        icon: User2,
        statusKey: 'account',
      },
      {
        href: '/settings/equipment',
        title: 'Équipement',
        description: 'Sports pratiqués et matériel disponible.',
        icon: Dumbbell,
        statusKey: 'equipment',
      },
      {
        href: '/settings/calibration',
        title: 'Seuils & repères',
        description: 'FTP, allure seuil, FC max et historique des seuils.',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    id: 'coach-context',
    title: 'Contexte coach',
    blurb: "Ce qui oriente le chat, la semaine et l'adaptation du plan.",
    entries: [
      {
        href: '/settings/memory',
        title: 'Mémoire du coach',
        description: 'Préférences durables et contraintes datées.',
        icon: Brain,
        statusKey: 'memory',
      },
      {
        href: '/settings/integrations',
        title: 'Applications connectées',
        description: 'Sources de données et synchronisations.',
        icon: Link2,
        statusKey: 'integrations',
      },
    ],
  },
  {
    id: 'application',
    title: 'Application',
    blurb: 'Préférences produit et informations système.',
    entries: [
      {
        href: '/settings/appearance',
        title: 'Apparence',
        description: 'Thème clair, sombre ou système.',
        icon: MoonStar,
        statusKey: 'appearance',
      },
      {
        href: '/settings/appearance/expert-mode',
        title: 'Mode Expert',
        description: 'Densité de lecture: révèle ou masque la couche technique.',
        icon: Microscope,
        statusKey: 'expertMode',
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
        statusKey: 'about',
      },
    ],
  },
];

function featuredMeta(statusKey: SettingsEntry['statusKey']) {
  if (!statusKey) {
    return null;
  }
  if (statusKey === 'appearance') {
    return <SettingsAppearanceStatus />;
  }
  if (statusKey === 'expertMode') {
    return <SettingsExpertModeStatus />;
  }
  return <HubStatusValue statusKey={statusKey as keyof SettingsHubStatus} />;
}

/**
 * Moi hub — Shell V1 profile destination.
 * Corps / objectifs / Confidentialité are first-class; the rest of settings follows.
 */
export function MoiHub() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Ton modèle, tes données</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Corps, objectifs et confidentialité d&apos;abord — puis le reste du compte.
        </p>
      </StickyHeader>

      <section aria-labelledby="moi-featured" className="space-y-3">
        <h2 className="text-section-title" id="moi-featured">
          Essentiel
        </h2>
        <ul className="space-y-2">
          {FEATURED.map((entry) => (
            <ShellHubLink
              key={entry.href}
              href={entry.href}
              title={entry.title}
              description={entry.description}
              icon={entry.icon}
              meta={featuredMeta(entry.statusKey)}
            />
          ))}
        </ul>
      </section>

      <div className="space-y-7">
        {GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`moi-group-${group.id}`}>
            <div className="mb-3">
              <h2 className="text-section-title" id={`moi-group-${group.id}`}>
                {group.title}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{group.blurb}</p>
            </div>
            <ul className="space-y-2">
              {group.entries.map((entry) => (
                <SettingsEntryRow key={entry.href} entry={entry} />
              ))}
            </ul>
          </section>
        ))}

        <Suspense fallback={null}>
          <SettingsAdminEntry />
        </Suspense>
      </div>

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

      <Suspense>
        <InstallCard />
      </Suspense>

      <Suspense>
        <SettingsSignOut />
      </Suspense>
    </div>
  );
}
