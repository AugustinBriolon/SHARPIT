'use client';

import Link from 'next/link';
import { Goal, Brain, Dumbbell, Link2, MoonStar, ShieldCheck, User2, Wrench } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { SettingsMaintenancePanel } from '@/components/settings/maintenance';
import { InstallCard } from '@/components/pwa/install-card';
import { cn } from '@/lib/utils';

type SettingsEntry = {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ENTRIES: SettingsEntry[] = [
  {
    href: '/settings/account',
    title: 'Compte',
    description: 'Identité athlète, seuils et paramètres physiologiques.',
    icon: User2,
  },
  {
    href: '/settings/equipment',
    title: 'Équipement',
    description: 'Matériel disponible par sport pour adapter les séances.',
    icon: Dumbbell,
  },
  {
    href: '/settings/appearance',
    title: 'Apparence',
    description: 'Choix du thème clair, sombre ou système.',
    icon: MoonStar,
  },
  {
    href: '/settings/goals',
    title: 'Objectifs',
    description: 'Courses cibles et objectifs chiffrés.',
    icon: Goal,
  },
  {
    href: '/settings/integrations',
    title: 'Applications connectées',
    description: 'Sources de données et connexions actives.',
    icon: Link2,
  },
  {
    href: '/settings/memory',
    title: 'Mémoire du coach',
    description: 'Déplacements, contexte durable et entrées retenues par le coach.',
    icon: Brain,
  },
  {
    href: '/settings/about',
    title: 'À propos',
    description: 'Version produit, positionnement et principes SHARPIT.',
    icon: ShieldCheck,
  },
];

function SettingsEntryCard({ entry }: { entry: SettingsEntry }) {
  const Icon = entry.icon;

  return (
    <Link
      href={entry.href}
      className={cn(
        'chip-surface group rounded-analysis-lg flex h-full items-center gap-3 px-3 py-2.5 transition-colors',
        'hover:border-primary/25',
      )}
    >
      <div className="icon-well size-9">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{entry.title}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{entry.description}</p>
      </div>
      <span
        className="text-muted-foreground/70 text-data shrink-0 text-[11px] tracking-wider transition-transform group-hover:translate-x-0.5"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

export function SettingsHome() {
  return (
    <div className="space-y-5">
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Compte, données & application</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure ton compte, tes objectifs, tes sources connectées et les préférences
          d&apos;application.
        </p>
      </StickyHeader>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch">
        {ENTRIES.map((entry) => (
          <SettingsEntryCard key={entry.href} entry={entry} />
        ))}
      </div>
      <div className="analysis-panel-alt rounded-analysis-lg p-4">
        <div className="flex items-start gap-3">
          <div className="icon-well size-9">
            <Wrench className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Maintenance</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Outils locaux disponibles ici — pas de sous-page, les actions s&apos;affichent
              directement ci-dessous.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <SettingsMaintenancePanel variant="embedded" />
        </div>
      </div>
      <InstallCard />
    </div>
  );
}
