'use client';

import Link from 'next/link';
import {
  ChevronRight,
  Goal,
  Brain,
  Link2,
  MoonStar,
  ShieldCheck,
  User2,
  Wrench,
} from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { SettingsMaintenancePanel } from '@/components/settings/settings-maintenance-panel';
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
        'group flex h-full items-center gap-3 rounded-2xl border px-4 py-4 transition-colors',
        'hover:border-primary/20 hover:bg-primary/5',
      )}
    >
      <div className="bg-primary/10 ring-primary/15 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1">
        <Icon className="text-primary size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{entry.title}</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{entry.description}</p>
      </div>
      <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function SettingsHome() {
  return (
    <div className="space-y-5">
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Compte, données & application</h1>
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
      <div
        className={cn(
          'rounded-2xl border border-dashed px-4 py-4',
          'border-muted-foreground/20 bg-muted/30',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="bg-muted ring-border/60 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1">
            <Wrench className="text-muted-foreground size-4" />
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
    </div>
  );
}
