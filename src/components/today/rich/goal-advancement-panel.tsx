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

/** Plan vivant = ink instrument band (same family as Verdict / plaque Objectif). */
export const PLAN_VIVANT_SHELL_CLASS =
  'surface-ink rounded-analysis-lg space-y-4 px-4 py-4 sm:px-5 sm:py-5';

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
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div
      aria-label={`Progression ${clamped} %`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className="bg-ink-surface-foreground/15 h-1.5 overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className="bg-highlight dark:bg-ink-surface-foreground h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${clamped}%` }}
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
      <p className="text-ink-surface-foreground/70 text-xs leading-relaxed text-pretty">
        {EMPTY_TRAIL}
      </p>
    );
  }
  return (
    <ol className="text-ink-surface-foreground/75 space-y-2 text-xs leading-relaxed">
      {view.trail.map((item) => (
        <li key={item.id} className="flex gap-2 text-pretty">
          <span
            className="text-highlight dark:text-ink-surface-foreground mt-0.5 shrink-0"
            aria-hidden
          >
            ·
          </span>
          <span>{item.label}</span>
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
  const trailCount = view.trail.length;

  return (
    <div className="space-y-0">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="border-ink-surface-foreground/25 hover:bg-ink-surface-foreground/8 focus-visible:ring-highlight/60 flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-start transition-colors duration-150 outline-none focus-visible:ring-2"
        type="button"
        onClick={() => onOpenChange(!open)}
      >
        <span className="text-ink-surface-foreground min-w-0 flex-1 text-xs font-medium text-pretty">
          Ce que le coaching a changé
          {trailCount > 0 ? (
            <span className="text-data text-ink-surface-foreground/55 ml-1.5 tabular-nums">
              · {trailCount}
            </span>
          ) : null}
        </span>
        <NavArrowDown
          className={cn(
            'text-ink-surface-foreground/55 size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <MotionExpand id={panelId} open={open}>
        <div className="space-y-2 px-0.5 pt-2.5 pb-0.5">
          <TrailList view={view} />
          {view.phaseLabel ? (
            <p className="text-label text-ink-surface-foreground/55">Phase · {view.phaseLabel}</p>
          ) : null}
        </div>
      </MotionExpand>
    </div>
  );
}

function AdvancementSectionHeader({
  view,
  prominence,
  headlineId,
}: {
  view: GoalAdvancementView;
  prominence: 'primary' | 'secondary';
  headlineId: string;
}) {
  const isPrimary = prominence === 'primary';
  return (
    <div className="space-y-1.5">
      <h3
        id={headlineId}
        className={cn(
          'text-ink-surface-foreground text-pretty',
          isPrimary
            ? 'text-verdict text-[1.5rem] leading-[1.15] sm:text-[1.75rem]'
            : 'text-section-title',
          view.progress !== null && 'tabular-nums',
        )}
      >
        {view.headline}
      </h3>
      {view.goalLabel ? (
        <p className="text-ink-surface-foreground/65 text-xs leading-snug text-pretty">
          vers {view.goalLabel}
        </p>
      ) : null}
      <p className="text-ink-surface-foreground/70 text-xs leading-relaxed text-pretty">
        {view.why}
      </p>
    </div>
  );
}

/**
 * Suivi body absorbed into Plan vivant — no outer panel.
 * Lives on ink shell; week rail = contiguous tally strip.
 */
export function PlanVivantAdvancementSection({
  view,
  className,
  showDivider = false,
  prominence = 'primary',
}: {
  view: GoalAdvancementView;
  className?: string;
  showDivider?: boolean;
  prominence?: 'primary' | 'secondary';
}) {
  const [trailOpen, setTrailOpen] = useState(false);
  const headlineId = useId();
  const preview = weekSegmentsAsPreview(view.weekSegments);

  return (
    <div
      className={cn(
        'space-y-3.5',
        showDivider && 'border-ink-surface-foreground/20 border-t pt-4',
        className,
      )}
    >
      <AdvancementSectionHeader headlineId={headlineId} prominence={prominence} view={view} />
      {view.progress !== null ? <AdvancementProgress progress={view.progress} /> : null}
      <RearrangeSessionRail
        ariaLabel="Exécution de la semaine"
        caption="Cette semaine"
        flow="tally"
        sessions={preview}
        onInk
      />
      <AdvancementTrail open={trailOpen} view={view} onOpenChange={setTrailOpen} />
      <Link
        className="text-highlight hover:text-highlight/85 dark:text-ink-surface-foreground dark:hover:text-ink-surface-foreground/80 pressable inline-flex min-h-11 items-center gap-1 text-xs font-medium transition-colors duration-150 sm:min-h-10"
        href={view.href}
      >
        Voir l’objectif
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export function PlanVivantEyebrow({
  goalLabel: _goalLabel,
  habitDriven = false,
}: {
  goalLabel?: string | null;
  habitDriven?: boolean;
}) {
  void _goalLabel;
  return (
    <div className="text-data text-ink-surface-foreground/65 inline-flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wide uppercase">
      <span
        className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
        aria-hidden
      />
      <span>Plan vivant</span>
      {habitDriven ? (
        <span className="border-ink-surface-foreground/30 text-ink-surface-foreground/70 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase">
          Journal
        </span>
      ) : null}
    </div>
  );
}

/**
 * Plan hub lab-note, or Today suivi-only fallback shell (ink Plan vivant).
 */
export function GoalAdvancementPanel({
  view,
  className,
  density = 'panel',
}: {
  view: GoalAdvancementView;
  className?: string;
  density?: 'panel' | 'note';
}) {
  if (density === 'note') {
    return <AdvancementNote className={className} view={view} />;
  }

  return (
    <FadeIn>
      <section
        aria-label="Plan vivant — suivi vers l’objectif"
        className={cn(PLAN_VIVANT_SHELL_CLASS, className)}
      >
        <PlanVivantEyebrow />
        <PlanVivantAdvancementSection prominence="primary" view={view} />
      </section>
    </FadeIn>
  );
}
