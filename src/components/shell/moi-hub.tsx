import { Suspense } from 'react';
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
import { SettingsAdminEntry } from '@/components/settings/settings-admin-entry';
import { SettingsHomeExtras } from '@/components/settings/settings-home-extras';
import { SettingsSignOut } from '@/components/settings/settings-sign-out';
import {
  SettingsEntryRow,
  type SettingsEntry,
} from '@/components/settings/settings-home';
import {
  MOI_CORPS_PATH,
  MOI_OBJECTIFS_PATH,
  MOI_PRIVACY_PATH,
} from '@/lib/moi/paths';

/** Primary destinations — one intention each, no Accès dump. */
const DESTINATIONS: SettingsEntry[] = [
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
    href: MOI_PRIVACY_PATH,
    title: 'Confidentialité',
    description: 'Consentements, export et suppression du compte.',
    icon: Lock,
  },
];

/** Compte / équipement — secondary, still chip rows. */
const SECONDARY: SettingsEntry[] = [
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
];

/** Quiet réglages — demoted text links, not a second Accès dump. */
const QUIET: { href: string; title: string; icon: SettingsEntry['icon'] }[] = [
  { href: '/settings/calibration', title: 'Seuils & repères', icon: SlidersHorizontal },
  { href: '/settings/memory', title: 'Mémoire du coach', icon: Brain },
  { href: '/settings/integrations', title: 'Applications connectées', icon: Link2 },
  { href: '/settings/appearance', title: 'Apparence', icon: MoonStar },
  { href: '/settings/appearance/expert-mode', title: 'Mode Expert', icon: Microscope },
  { href: '/settings/pro', title: 'Pro', icon: Gauge },
  { href: '/settings/about', title: 'À propos', icon: ShieldCheck },
];

/**
 * Moi hub — Shell V1.1 destinations (not an Accès link dump).
 *
 * Corps · Objectifs · Confidentialité first. Compte / équipement secondary.
 * Remaining settings stay quiet links. Dedicated child pages own their content.
 */
export function MoiHub() {
  return (
    <div className="space-y-6 max-lg:pb-10">
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Ton modèle, tes données</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Corps, objectifs et confidentialité — puis le compte.
        </p>
      </StickyHeader>

      <section aria-labelledby="moi-destinations" className="space-y-3">
        <h2 className="text-section-title" id="moi-destinations">
          Destinations
        </h2>
        <ul className="space-y-2">
          {DESTINATIONS.map((entry) => (
            <ShellHubLink
              key={entry.href}
              href={entry.href}
              title={entry.title}
              description={entry.description}
              icon={entry.icon}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="moi-secondary" className="space-y-3">
        <div>
          <h2 className="text-section-title" id="moi-secondary">
            Compte &amp; équipement
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Identité et matériel — ce que le Twin utilise au quotidien.
          </p>
        </div>
        <ul className="space-y-2">
          {SECONDARY.map((entry) => (
            <SettingsEntryRow key={entry.href} entry={entry} />
          ))}
        </ul>
      </section>

      <nav aria-label="Réglages" className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        {QUIET.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.href}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
              href={entry.href}
            >
              <Icon className="size-3.5" aria-hidden />
              {entry.title}
            </Link>
          );
        })}
      </nav>

      <Suspense fallback={null}>
        <SettingsAdminEntry />
      </Suspense>

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
