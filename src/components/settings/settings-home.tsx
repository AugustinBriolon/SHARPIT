'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Brain, Dumbbell, Goal, Link2, MoonStar, ShieldCheck, User2, Wrench } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { InstallCard } from '@/components/pwa/install-card';
import { useThemePreference } from '@/providers/theme-provider';
import { themeStatusLabel, type SettingsHubStatus } from '@/lib/settings/hub-status';
import { cn } from '@/lib/utils';

const SettingsMaintenancePanel = dynamic(
  () => import('@/components/settings/maintenance').then((mod) => mod.SettingsMaintenancePanel),
  { ssr: false },
);

/** One streamed status node per server-backed entry, keyed by status key. */
export type SettingsStatusSlots = Record<keyof SettingsHubStatus, React.ReactNode>;

type SettingsEntry = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  statusKey: keyof SettingsHubStatus | 'appearance';
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
    blurb: 'Identité, matériel et cap de course — ce que le Twin sait de toi.',
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
        description: 'Matériel disponible par sport.',
        icon: Dumbbell,
        statusKey: 'equipment',
      },
      {
        href: '/settings/goals',
        title: 'Objectifs',
        description: 'Courses cibles et objectifs chiffrés.',
        icon: Goal,
        statusKey: 'goals',
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
        href: '/settings/about',
        title: 'À propos',
        description: 'Version et principes SHARPIT.',
        icon: ShieldCheck,
        statusKey: 'about',
      },
    ],
  },
];

/** Appearance is the one status the client owns — it comes from the theme store. */
function AppearanceStatus() {
  const { preference } = useThemePreference();
  return themeStatusLabel(preference);
}

function SettingsEntryRow({
  entry,
  statusSlots,
}: {
  entry: SettingsEntry;
  statusSlots: SettingsStatusSlots;
}) {
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
              {entry.statusKey === 'appearance' ? (
                <AppearanceStatus />
              ) : (
                statusSlots[entry.statusKey]
              )}
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

export function SettingsHome({ statusSlots }: { statusSlots: SettingsStatusSlots }) {
  return (
    <div className="space-y-6">
      <StickyHeader>
        <p className="text-label">Réglages</p>
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
                <SettingsEntryRow key={entry.href} entry={entry} statusSlots={statusSlots} />
              ))}
            </ul>
          </section>
        ))}
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
              Outils locaux (cache et rechargement) — aussi via{' '}
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
          <SettingsMaintenancePanel variant="embedded" />
        </div>
      </section>

      {/* Decides visibility from the current time against the dismissal stamp,
          so it can't prerender. It renders nothing when hidden — no fallback. */}
      <Suspense>
        <InstallCard />
      </Suspense>
    </div>
  );
}
