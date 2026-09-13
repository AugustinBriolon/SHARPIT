'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { FadeIn, MotionExpand } from '@/components/motion';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import {
  buildGoalAdvancementLabNote,
  type GoalAdvancementView,
} from '@/lib/today/rich/goal-advancement';
import type { RearrangePreviewSession } from '@/lib/today/rich/rearrange-preview';
import { cn } from '@/lib/utils';
import { NavArrowDown } from '@/components/icons/nav-arrows';

const EMPTY_TRAIL = 'Pas encore d’ajustement validé cette semaine — le Twin suit l’exécution.';

function AdvancementNote({ view, className }: { view: GoalAdvancementView; className?: string }) {
  const note = buildGoalAdvancementLabNote(view);
  return (
    <p
      className={cn(
        'text-ink-surface-foreground/70 mt-3 text-[11px] leading-snug text-pretty',
        className,
      )}
    >
      <span className="text-label text-ink-surface-foreground/55 mr-1.5 inline">Suivi</span>
      {note}
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
        className="bg-highlight h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

function weekSegmentsAsPreview(
  segments: GoalAdvancementView['weekSegments'],
): RearrangePreviewSession[] {
  return segments.map((segment) => ({
    id: segment.id,
    dateLabel: segment.dateLabel,
    intensityLabel: segment.intensityLabel,
    intensity: null,
    tone: segment.tone,
  }));
}

function TrailList({ view }: { view: GoalAdvancementView }) {
  if (view.trail.length === 0) {
    return (
      <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{EMPTY_TRAIL}</p>
    );
  }
  return (
    <ol className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
      {view.trail.map((item) => (
        <li key={item.id} className="text-pretty">
          <span className="text-muted-foreground/50 mr-1.5" aria-hidden>
            ·
          </span>
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function AdvancementTrail({
  view,
  open,
  onOpenChange,
}: {
  view: GoalAdvancementView;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const panelId = useId();

  return (
    <div className="space-y-0">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-2 rounded-md text-start text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-2 sm:min-h-10"
        type="button"
        onClick={() => onOpenChange(!open)}
      >
        <span className="min-w-0 flex-1 text-pretty">Ce que le coaching a changé</span>
        <NavArrowDown
          className={cn(
            'size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <MotionExpand id={panelId} open={open}>
        <div className="space-y-2 pb-0.5">
          <TrailList view={view} />
          {view.phaseLabel ? (
            <p className="text-label text-muted-foreground/80">Phase · {view.phaseLabel}</p>
          ) : null}
        </div>
      </MotionExpand>
    </div>
  );
}

/**
 * Suivi body absorbed into Plan vivant — no outer analysis-panel.
 * Rail réutilise RearrangeSessionRail (même idiome chips / tones).
 */
export function PlanVivantAdvancementSection({
  view,
  className,
  showDivider = false,
}: {
  view: GoalAdvancementView;
  className?: string;
  /** Hairline when section sits under rearrange / after-apply body. */
  showDivider?: boolean;
}) {
  const [trailOpen, setTrailOpen] = useState(false);
  const headlineId = useId();
  const preview = weekSegmentsAsPreview(view.weekSegments);

  return (
    <div
      className={cn(
        'space-y-3',
        showDivider && 'border-analysis-border/60 border-t pt-3',
        className,
      )}
    >
      <div className="space-y-1">
        <h3
          className={cn('text-card-title text-pretty', view.progress !== null && 'tabular-nums')}
          id={headlineId}
        >
          {view.headline}
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{view.why}</p>
      </div>
      {view.progress !== null ? <AdvancementProgress progress={view.progress} /> : null}
      <RearrangeSessionRail ariaLabel="Exécution de la semaine" sessions={preview} />
      <AdvancementTrail open={trailOpen} view={view} onOpenChange={setTrailOpen} />
      <Link
        className="text-primary hover:text-primary/80 pressable inline-flex min-h-11 items-center gap-1 text-xs font-medium transition-colors duration-150 sm:min-h-10"
        href={view.href}
      >
        Voir l’objectif
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function PlanVivantEyebrow({ goalLabel }: { goalLabel: string }) {
  return (
    <p className="text-label">
      Plan vivant
      {goalLabel ? (
        <>
          {' · '}
          <span className="text-foreground/80 tracking-normal normal-case">vers {goalLabel}</span>
        </>
      ) : null}
    </p>
  );
}

/**
 * Plan hub lab-note, or Today suivi-only fallback shell (same Plan vivant panel).
 * Density `panel` = shell alone when no rearrange / after-apply.
 */
export function GoalAdvancementPanel({
  view,
  className,
  density = 'panel',
}: {
  view: GoalAdvancementView;
  className?: string;
  /** `panel` = Plan vivant shell fallback; `note` = quiet lab-note under Plan destination. */
  density?: 'panel' | 'note';
}) {
  if (density === 'note') {
    return <AdvancementNote className={className} view={view} />;
  }

  return (
    <FadeIn>
      <section
        aria-label="Plan vivant — suivi vers l’objectif"
        className={cn(
          'analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-3 border px-3.5 py-3.5 sm:px-4 sm:py-4',
          className,
        )}
      >
        <PlanVivantEyebrow goalLabel={view.goalLabel} />
        <PlanVivantAdvancementSection view={view} />
      </section>
    </FadeIn>
  );
}
