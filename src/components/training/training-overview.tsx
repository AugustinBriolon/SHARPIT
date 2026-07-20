'use client';

import Link from 'next/link';
import { CalendarRange, ClipboardList, History, ListChecks, TrendingUp } from 'lucide-react';
import { PageBleed } from '@/components/layout/page-bleed';
import { StickyHeader } from '@/components/layout/sticky-header';

const TRAINING_SECTIONS = [
  {
    href: '/training/sessions',
    title: 'Sessions',
    description: "Vue opérationnelle du jour, du plan et de l'exécution.",
    icon: ListChecks,
  },
  {
    href: '/training/progression',
    title: 'Progression',
    description: 'Suivi du plan, de la régularité et des tendances d’entraînement.',
    icon: TrendingUp,
  },
  {
    href: '/training/planning',
    title: 'Planning',
    description: 'Organisation du cycle, ajustements et prochaines séances.',
    icon: ClipboardList,
  },
  {
    href: '/training/history',
    title: 'History',
    description: 'Historique complet des activités enregistrées.',
    icon: History,
  },
  {
    href: '/training/calendar',
    title: 'Calendar',
    description: 'Vue temporelle du plan, du réalisé et du reste à venir.',
    icon: CalendarRange,
  },
] as const;

export function TrainingOverview() {
  return (
    <div className="space-y-5">
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Centre opérationnel</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Comprends ce qui était prévu, ce qui a été fait et comment ton entraînement progresse.
        </p>
      </StickyHeader>

      <nav aria-label="Sections Entraînement" className="grid gap-3 md:grid-cols-2">
        {TRAINING_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              className="analysis-panel rounded-analysis-lg hover:border-primary/20 hover:bg-analysis-surface-alt/60 px-4 py-4 transition-colors"
              href={section.href}
            >
              <div className="flex items-start gap-3">
                <div className="icon-well rounded-analysis-lg size-9">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{section.title}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <PageBleed className="py-5" ink>
        <div className="flex items-start gap-3">
          <div className="icon-well rounded-analysis-lg size-10">
            <TrendingUp className="size-4" />
          </div>
          <div>
            <p className="text-ink-surface-foreground text-sm font-medium">
              Overview canonique posée
            </p>
            <p className="text-ink-surface-foreground/75 mt-1 text-sm leading-relaxed">
              Cette landing fixe la structure durable du hub Entraînement. Le redesign détaillé
              viendra ensuite autour du prévu, du réalisé, de la progression et de la conformité au
              plan.
            </p>
          </div>
        </div>
      </PageBleed>
    </div>
  );
}
