import { Suspense } from 'react';
import Link from 'next/link';
import {
  Brain,
  Dumbbell,
  Gauge,
  Link2,
  Microscope,
  MoonStar,
  ShieldCheck,
  SlidersHorizontal,
  User2,
  Wrench,
} from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { InstallCard } from '@/components/pwa/install-card';
import { HubStatusValue } from '@/components/settings/hub-status-value';
import {
  SettingsAppearanceStatus,
  SettingsExpertModeStatus,
} from '@/components/settings/settings-appearance-status';
import { SettingsAdminEntry } from '@/components/settings/settings-admin-entry';
import { SettingsHomeExtras } from '@/components/settings/settings-home-extras';
import { SettingsSignOut } from '@/components/settings/settings-sign-out';
import type { SettingsHubStatus } from '@/lib/settings/hub-status';
import { cn } from '@/lib/utils';

export type SettingsEntry = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Omitted when the entry has no single value worth reading at a glance. */
  statusKey?: keyof SettingsHubStatus | 'appearance' | 'expertMode';
};

type SettingsGroup = {
  id: string;
  title: string;
  blurb: string;
  entries: SettingsEntry[];
};

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

function entryStatus(statusKey: SettingsEntry['statusKey']) {
  if (!statusKey) {
    return null;
  }
  if (statusKey === 'appearance') {
    return <SettingsAppearanceStatus />;
  }
  if (statusKey === 'expertMode') {
    return <SettingsExpertModeStatus />;
  }
  return <HubStatusValue statusKey={statusKey} />;
}

export function SettingsEntryRow({ entry }: { entry: SettingsEntry }) {
  const Icon = entry.icon;

  return (
    <li>
      <Link
        href={entry.href}
        className={cn(
          'chip-surface-lg group flex items-center gap-3 px-3 py-2.5',
          'rounded-analysis-lg hover:border-primary/25 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <div className="icon-well size-9 shrink-0" aria-hidden>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-medium">{entry.title}</p>
            <p className="text-data text-muted-foreground text-xs tabular-nums">
              {entryStatus(entry.statusKey)}
            </p>
          </div>
          <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
            {entry.description}
          </p>
        </div>
        <span
          className="text-muted-foreground/70 text-data shrink-0 text-xs tracking-wider transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}

/**
 * Server Component on purpose. The hub chips call `connection()` and must
 * stay in the RSC tree so PPR can resume them. Nesting those islands as
 * slots of a Client Component left the skeletons on screen forever.
 */
export function SettingsHome() {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Compte, données & application</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rangées par rôle : ce qui te définit, ce qui contextualise le coach, puis
          l&apos;application.
        </p>
      </StickyHeader>

      <div className="space-y-7">
        {GROUPS.map((group) => (
          <section key={group.id} aria-labelledby={`settings-group-${group.id}`}>
            <div className="mb-3">
              <h2 className="text-section-title" id={`settings-group-${group.id}`}>
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

        {/* Renders nothing for a non-admin — same "invisible unless there's
            something to show" pattern as InstallCard / SettingsSignOut below. */}
        <Suspense fallback={null}>
          <SettingsAdminEntry />
        </Suspense>
      </div>

      <section
        aria-labelledby="settings-maintenance"
        className="analysis-panel-alt rounded-analysis-lg p-4"
      >
        <div className="flex items-start gap-3">
          <div className="icon-well size-9" aria-hidden>
            <Wrench className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium" id="settings-maintenance">
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

      {/* Decides visibility from the current time against the dismissal stamp,
          so it can't prerender. It renders nothing when hidden — no fallback. */}
      <Suspense>
        <InstallCard />
      </Suspense>

      <Suspense>
        <SettingsSignOut />
      </Suspense>
    </div>
  );
}
