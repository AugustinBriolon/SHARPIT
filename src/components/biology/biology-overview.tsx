'use client';

import Link from 'next/link';
import { Activity, BedDouble, BrainCircuit, HeartPulse, Scale, Waves } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { TodayDashboard } from '@/components/today/today-dashboard';

const BIOLOGY_SECTIONS = [
  {
    href: '/biology/recovery',
    title: 'Recovery',
    description: 'Readiness, restitution et signaux de récupération.',
    icon: HeartPulse,
  },
  {
    href: '/biology/sleep',
    title: 'Sleep',
    description: 'Dette, régularité et coucher conseillé.',
    icon: BedDouble,
  },
  {
    href: '/biology/effort',
    title: 'Effort',
    description: 'Réponse à la contrainte et charge interne du jour.',
    icon: Activity,
  },
  {
    href: '/biology/adaptation',
    title: 'Adaptation',
    description: 'Trajectoire, assimilation et dynamique de progression.',
    icon: Waves,
  },
  {
    href: '/biology/body',
    title: 'Body',
    description: 'Composition corporelle, suivi physique et signaux associés.',
    icon: Scale,
  },
] as const;

export function BiologyOverview() {
  return (
    <div className="space-y-5">
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Physiologie
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Lecture du Digital Twin</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Comprends comment ton corps répond maintenant, puis explore chaque système en détail.
        </p>
      </StickyHeader>

      <section className="rounded-2xl border px-4 py-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="bg-primary/10 ring-primary/15 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1">
            <BrainCircuit className="text-primary size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Overview</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Cette vue de synthèse sert de point d’entrée temporaire en phase 1. Les dimensions
              détaillées convergent progressivement vers ce hub.
            </p>
          </div>
        </div>
        <TodayDashboard />
      </section>

      <nav aria-label="Sections Physiologie" className="grid gap-3 md:grid-cols-2">
        {BIOLOGY_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              className="hover:border-primary/20 hover:bg-primary/5 rounded-2xl border px-4 py-4 transition-colors"
              href={section.href}
            >
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 ring-primary/15 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1">
                  <Icon className="text-primary size-4" />
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
    </div>
  );
}
