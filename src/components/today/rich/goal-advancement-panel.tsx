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

export const PLAN_VIVANT_SHELL_CLASS =
  'analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-4 border px-4 py-4 sm:px-5 sm:py-5';

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

/** Bar only — headline already carries the % when progress is set (Metric Card fill). */
function AdvancementProgress({ progress }: { progress: number }) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div
      aria-label={`Progression ${clamped} %`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className="bg-foreground/10 h-1.5 overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className="bg-highlight h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none"
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
      <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{EMPTY_TRAIL}</p>
    );
  }
  return (
    <ol className="text-muted-foreground space-y-2 text-xs leading-relaxed">
      {view.trail.map((item) => (
        <li key={item.id} className="flex gap-2 text-pretty">
          <span className="text-primary/70 mt-0.5 shrink-0" aria-hidden>
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
        className="border-analysis-border/70 hover:bg-muted/35 focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-start transition-colors duration-150 outline-none focus-visible:ring-2"
        type="button"
        onClick={() => onOpenChange(!open)}
      >
        <span className="text-foreground min-w-0 flex-1 text-xs font-medium text-pretty">
          Ce que le coaching a changé
          {trailCount > 0 ? (
            <span className="text-muted-foreground text-data ml-1.5 tabular-nums">
              · {trailCount}
            </span>
          ) : null}
        </span>
        <NavArrowDown
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <MotionExpand id={panelId} open={open}>
        <div className="space-y-2 px-0.5 pt-2.5 pb-0.5">
          <TrailList view={view} />
          {view.phaseLabel ? (
            <p className="text-label text-muted-foreground/80">Phase · {view.phaseLabel}</p>
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
          'text-pretty',
          isPrimary ? 'text-verdict' : 'text-section-title',
          view.progress !== null && 'tabular-nums',
        )}
      >
        {view.headline}
      </h3>
      {view.goalLabel ? (
        <p className="text-muted-foreground text-xs leading-snug text-pretty">
          vers {view.goalLabel}
        </p>
      ) : null}
      <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{view.why}</p>
    </div>
  );
}

/**
 * Suivi body absorbed into Plan vivant — no outer analysis-panel.
 * Rail semaine = tally fill (faits parallèles) ; tension rearrange reste sequence.
 */
export function PlanVivantAdvancementSection({
  view,
  className,
  showDivider = false,
  /** When true, section owns the Tier-1 headline (suivi-only). When under rearrange, quieter. */
  prominence = 'primary',
}: {
  view: GoalAdvancementView;
  className?: string;
  /** Hairline when section sits under rearrange / after-apply body. */
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
        showDivider && 'border-analysis-border/60 border-t pt-4',
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
      />
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

export function PlanVivantEyebrow({
  goalLabel: _goalLabel,
  habitDriven = false,
}: {
  /** @deprecated Goal lives under the headline — kept for call-site compatibility. */
  goalLabel?: string | null;
  habitDriven?: boolean;
}) {
  void _goalLabel;
  return (
    <p className="text-label flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>Plan vivant</span>
      {habitDriven ? (
        <span className="border-analysis-border/80 bg-background/70 text-muted-foreground inline-flex items-center rounded-md border px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase">
          Journal
        </span>
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
        className={cn(PLAN_VIVANT_SHELL_CLASS, className)}
      >
        <PlanVivantEyebrow />
        <PlanVivantAdvancementSection prominence="primary" view={view} />
      </section>
    </FadeIn>
  );
}
