'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import type { GoalAdvancementView } from '@/lib/today/rich/goal-advancement';
import { cn } from '@/lib/utils';

function AdvancementNote({ view, className }: { view: GoalAdvancementView; className?: string }) {
  return (
    <p
      className={cn(
        'text-ink-surface-foreground/70 mt-3 text-[11px] leading-snug text-pretty',
        className,
      )}
    >
      <span className="text-label text-ink-surface-foreground/55 mr-1.5 inline">Suivi</span>
      {view.headline}
      {view.facts.length > 0 ? (
        <span className="text-ink-surface-foreground/55">
          {' '}
          · {view.facts.map((f) => f.label).join(' · ')}
        </span>
      ) : null}
    </p>
  );
}

function AdvancementProgress({ progress }: { progress: number }) {
  return (
    <div
      aria-label={`Progression ${progress} %`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progress}
      className="bg-muted h-1 overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className="bg-primary/70 h-full rounded-full transition-[width] duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function AdvancementFacts({ facts }: { facts: GoalAdvancementView['facts'] }) {
  if (facts.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Faits de progression" className="flex flex-wrap gap-1.5">
      {facts.map((fact) => (
        <li
          key={fact.id}
          className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-[11px] leading-none"
        >
          {fact.label}
        </li>
      ))}
    </ul>
  );
}

function AdvancementHeader({ view }: { view: GoalAdvancementView }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
        <TrendingUp className="size-3.5" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-label">
          {view.eyebrow}
          {view.goalLabel ? (
            <>
              {' · '}
              <span className="text-foreground/80 tracking-normal normal-case">
                vers {view.goalLabel}
              </span>
            </>
          ) : null}
        </p>
        <p className="text-card-title text-pretty">{view.headline}</p>
        <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{view.why}</p>
      </div>
    </div>
  );
}

/**
 * Suivi d’avancées — goal progress + coaching adapts (presentation only).
 * Lives under Plan vivant on Today; does not remount #94 goal anchor.
 */
export function GoalAdvancementPanel({
  view,
  className,
  density = 'panel',
}: {
  view: GoalAdvancementView;
  className?: string;
  /** `panel` = full analysis-panel; `note` = quiet lab-note under Plan destination. */
  density?: 'panel' | 'note';
}) {
  if (density === 'note') {
    return <AdvancementNote className={className} view={view} />;
  }

  return (
    <FadeIn>
      <section
        aria-label="Suivi d’avancées vers l’objectif"
        className={cn(
          'analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-3 border px-3.5 py-3.5 sm:px-4 sm:py-4',
          className,
        )}
      >
        <AdvancementHeader view={view} />
        {view.progress !== null ? <AdvancementProgress progress={view.progress} /> : null}
        <AdvancementFacts facts={view.facts} />
        <Link
          className="text-primary hover:text-primary/80 pressable inline-flex min-h-11 items-center gap-1 text-xs font-medium transition-colors duration-150 sm:min-h-0"
          href={view.href}
        >
          Voir l’objectif
          <span aria-hidden>→</span>
        </Link>
      </section>
    </FadeIn>
  );
}
