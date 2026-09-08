import { Suspense, type ReactNode } from 'react';
import {
  BookOpen,
  Brain,
  Bug,
  Dumbbell,
  FileText,
  Gauge,
  HeartPulse,
  Link2,
  Lock,
  MessageSquarePlus,
  MoonStar,
  Route,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  User2,
  Wrench,
} from 'lucide-react';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { InstallCard } from '@/components/pwa/install-card';
import { ShellHubGroup, ShellHubRow, ShellHubSolo } from '@/components/shell/shell-hub-link';
import { HubStatusValue } from '@/components/settings/hub-status-value';
import {
  SettingsAppearanceStatus,
  SettingsPersonalizationStatus,
} from '@/components/settings/settings-appearance-status';
import { SettingsAdminEntry } from '@/components/settings/settings-admin-entry';
import type { SettingsEntry } from '@/components/settings/settings-home';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { hasProAccess } from '@/lib/access/tier';
import {
  MOI_CALIBRATION_PATH,
  MOI_CORPS_PATH,
  MOI_FEEDBACK_PATH,
  MOI_HELP_PATH,
  MOI_OBJECTIFS_PATH,
  MOI_PERSONALIZATION_PATH,
  MOI_PRIVACY_PATH,
  MOI_PRO_PATH,
  MOI_WHATS_NEW_PATH,
} from '@/lib/moi/paths';
import { getAthleteProfile } from '@/lib/queries';

type HubEntry =
  | (Pick<SettingsEntry, 'href' | 'title' | 'icon'> & {
      meta?: ReactNode;
      comingSoon?: false;
    })
  | {
      title: string;
      icon: SettingsEntry['icon'];
      comingSoon: true;
      meta?: ReactNode;
      href?: never;
    };

type HubSection = {
  id: string;
  title: string;
  entries: HubEntry[];
};

const MODELE_SECTION: HubSection = {
  id: 'modele',
  title: 'Modèle',
  entries: [
    { href: MOI_CORPS_PATH, title: 'Corps', icon: HeartPulse },
    { href: MOI_OBJECTIFS_PATH, title: 'Objectifs', icon: Target },
    { href: MOI_CALIBRATION_PATH, title: 'Seuils & repères', icon: SlidersHorizontal },
    {
      href: '/settings/equipment',
      title: 'Équipement',
      icon: Dumbbell,
      meta: <HubStatusValue statusKey="equipment" />,
    },
    {
      href: '/settings/memory',
      title: 'Mémoire du coach',
      icon: Brain,
      meta: <HubStatusValue statusKey="memory" />,
    },
  ],
};

const COMPTE_BASE: HubEntry[] = [
  {
    href: '/settings/account',
    title: 'Profil',
    icon: User2,
    meta: <HubStatusValue statusKey="account" />,
  },
  { href: MOI_PRIVACY_PATH, title: 'Confidentialité', icon: Lock },
];

const PRO_ENTRY: HubEntry = {
  href: MOI_PRO_PATH,
  title: 'Pro',
  icon: Gauge,
};

const AFTER_COMPTE: HubSection[] = [
  {
    id: 'preferences',
    title: 'Préférences',
    entries: [
      {
        href: '/settings/appearance',
        title: 'Apparence',
        icon: MoonStar,
        meta: <SettingsAppearanceStatus />,
      },
      {
        href: MOI_PERSONALIZATION_PATH,
        title: 'Personnalisation',
        icon: SlidersHorizontal,
        meta: <SettingsPersonalizationStatus />,
      },
    ],
  },
  {
    id: 'donnees',
    title: 'Données',
    entries: [
      {
        href: '/settings/integrations',
        title: 'Sources de données',
        icon: Link2,
        meta: <HubStatusValue statusKey="integrations" />,
      },
      {
        comingSoon: true,
        title: 'Routage des sources',
        icon: Route,
      },
    ],
  },
  {
    id: 'ressources',
    title: 'Ressources',
    entries: [
      { href: MOI_WHATS_NEW_PATH, title: 'Nouveautés', icon: Sparkles },
      { href: MOI_HELP_PATH, title: 'Base de connaissances', icon: BookOpen },
      {
        href: '/settings/about',
        title: 'À propos',
        icon: ShieldCheck,
        meta: <HubStatusValue statusKey="about" />,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    entries: [
      {
        href: `${MOI_FEEDBACK_PATH}#demande`,
        title: 'Demander une fonctionnalité',
        icon: MessageSquarePlus,
      },
      { href: `${MOI_FEEDBACK_PATH}#bug`, title: 'Signaler un bug', icon: Bug },
      { href: '/settings/maintenance', title: 'Maintenance', icon: Wrench },
    ],
  },
  {
    id: 'legal',
    title: 'Mentions légales',
    entries: [
      { href: '/privacy', title: 'Politique de confidentialité', icon: Scale },
      { href: '/terms', title: 'Conditions d’utilisation', icon: FileText },
    ],
  },
];

/**
 * Paramètres hub — Bevel-shaped grouped lists (Modèle kept first).
 */
export function MoiHub() {
  return (
    <div className="space-y-5 max-lg:pb-16">
      <StickyHeader>
        <h1 className="text-page-title">Paramètres</h1>
      </StickyHeader>

      <div className="space-y-5">
        <Suspense fallback={<MoiHubStaticFallback />}>
          <MoiHubSections />
        </Suspense>
        <Suspense fallback={null}>
          <SettingsAdminEntry />
        </Suspense>
      </div>

      <Suspense>
        <InstallCard />
      </Suspense>
    </div>
  );
}

function MoiHubStaticFallback() {
  return (
    <>
      <HubSectionBlock section={MODELE_SECTION} />
      <HubSectionBlock
        section={{
          id: 'compte',
          title: 'Compte',
          entries: COMPTE_BASE,
        }}
      />
      {AFTER_COMPTE.map((section) => (
        <HubSectionBlock key={section.id} section={section} />
      ))}
    </>
  );
}

async function MoiHubSections() {
  const athleteId = await getCurrentAthleteId();
  const profile = await getAthleteProfile(athleteId);
  const isPro = hasProAccess(profile?.tier ?? 'FREE');

  const compteEntries: HubEntry[] = isPro ? [...COMPTE_BASE, PRO_ENTRY] : COMPTE_BASE;

  return (
    <>
      {!isPro ? (
        <ShellHubSolo aria-label="Offre Pro">
          <ShellHubRow href={MOI_PRO_PATH} icon={Gauge} title="SHARPIT Pro" />
        </ShellHubSolo>
      ) : null}
      <HubSectionBlock section={MODELE_SECTION} />
      <HubSectionBlock
        section={{
          id: 'compte',
          title: 'Compte',
          entries: compteEntries,
        }}
      />
      {AFTER_COMPTE.map((section) => (
        <HubSectionBlock key={section.id} section={section} />
      ))}
    </>
  );
}

function HubSectionBlock({ section }: { section: HubSection }) {
  return (
    <ShellHubGroup id={section.id} title={section.title}>
      {section.entries.map((entry) =>
        entry.comingSoon ? (
          <ShellHubRow
            key={entry.title}
            icon={entry.icon}
            meta={entry.meta}
            title={entry.title}
            comingSoon
          />
        ) : (
          <ShellHubRow
            key={entry.href}
            href={entry.href}
            icon={entry.icon}
            meta={entry.meta}
            title={entry.title}
          />
        ),
      )}
    </ShellHubGroup>
  );
}
