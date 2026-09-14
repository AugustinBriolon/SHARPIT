'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Route } from 'lucide-react';
import { FadeIn, MotionExpand } from '@/components/motion';
import { TodayInstrumentCard } from '@/components/today/dashboard/today-instrument-card';
import {
  buildGoalAdvancementLabNote,
  type GoalAdvancementView,
  type GoalAdvancementWeekSegment,
} from '@/lib/today/rich/goal-advancement';
import { cn } from '@/lib/utils';
import { NavArrowDown } from '@/components/icons/nav-arrows';

const EMPTY_TRAIL = 'Pas encore d’ajustement validé cette semaine — le Twin suit l’exécution.';

/**
 * Plan vivant answers one question: où en est ma semaine vers l'objectif ?
 *
 * It used to answer it on a full ink band with verdict-sized type, a tally rail
 * that stretched a single count across the whole width, and a bordered
 * accordion — a second dark hero competing with the verdict it sits under.
 * Ink is reserved for the verdict and the Objectif plate (§10.1); on Today this
 * is a sibling card, and the week reads as one proportional bar rather than a
 * row of boxes that degenerates at one segment.
 */
export type PlanVivantTone = 'ink' | 'plain';

/** Ink band — kept for the surfaces that host a confirmation or a proposal. */
export const PLAN_VIVANT_SHELL_CLASS =
  'surface-ink rounded-analysis-lg space-y-4 px-4 py-4 sm:px-5 sm:py-5';

type ToneClasses = {
  title: string;
  body: string;
  faint: string;
  track: string;
  hover: string;
  link: string;
  ring: string;
};

const TONE: Record<PlanVivantTone, ToneClasses> = {
  ink: {
    title: 'text-ink-surface-foreground',
    body: 'text-ink-surface-foreground/70',
    faint: 'text-ink-surface-foreground/55',
    track: 'bg-ink-surface-foreground/15',
    hover: 'hover:text-ink-surface-foreground',
    link: 'text-highlight hover:text-highlight/85 dark:text-ink-surface-foreground',
    ring: 'focus-visible:ring-highlight/60',
  },
  plain: {
    title: 'text-foreground',
    body: 'text-muted-foreground',
    faint: 'text-muted-foreground/80',
    track: 'bg-muted-foreground/15',
    hover: 'hover:text-foreground',
    link: 'text-primary hover:text-primary/85',
    ring: 'focus-visible:ring-primary/50',
  },
};

/** Semantic per §8.4 — adapted is a caution signal, done is capacity, rest is metadata. */
const SEGMENT_FILL: Record<GoalAdvancementWeekSegment['id'], Record<PlanVivantTone, string>> = {
  adapted: { ink: 'bg-signal-caution/80', plain: 'bg-signal-caution' },
  done: { ink: 'bg-highlight', plain: 'bg-primary' },
  remaining: { ink: 'bg-ink-surface-foreground/25', plain: 'bg-muted-foreground/30' },
};

function segmentCount(segment: GoalAdvancementWeekSegment): number {
  const parsed = Number.parseInt(segment.dateLabel, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function WeekMeter({
  segments,
  tone,
}: {
  segments: readonly GoalAdvancementWeekSegment[];
  tone: PlanVivantTone;
}) {
  const total = segments.reduce((sum, segment) => sum + segmentCount(segment), 0);
  if (total <= 0) {
    return null;
  }

  return (
    <div className={cn('flex h-1.5 overflow-hidden rounded-full', TONE[tone].track)} aria-hidden>
      {segments.map((segment) => (
        <span
          key={segment.id}
          className={SEGMENT_FILL[segment.id][tone]}
          style={{ width: `${(segmentCount(segment) / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function WeekLegend({
  segments,
  tone,
}: {
  segments: readonly GoalAdvancementWeekSegment[];
  tone: PlanVivantTone;
}) {
  return (
    <ul className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1', TONE[tone].body)}>
      {segments.map((segment) => (
        <li key={segment.id} className="flex items-baseline gap-1.5 text-[11px] leading-snug">
          <span
            className={cn(
              'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
              SEGMENT_FILL[segment.id][tone],
            )}
            aria-hidden
          />
          <span className={cn('text-data font-semibold tabular-nums', TONE[tone].title)}>
            {segment.dateLabel}
          </span>
          <span>{segment.intensityLabel}</span>
        </li>
      ))}
    </ul>
  );
}

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

function GoalProgressHairline({ progress, tone }: { progress: number; tone: PlanVivantTone }) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div
      aria-label={`Progression vers l’objectif ${clamped} %`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={cn('h-[3px] overflow-hidden rounded-full', TONE[tone].track)}
      role="progressbar"
    >
      <div
        style={{ width: `${clamped}%` }}
        className={cn(
          'h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none',
          tone === 'ink' ? 'bg-highlight dark:bg-ink-surface-foreground' : 'bg-primary',
        )}
      />
    </div>
  );
}

function TrailList({ view, tone }: { view: GoalAdvancementView; tone: PlanVivantTone }) {
  if (view.trail.length === 0) {
    return (
      <p className={cn('text-[11px] leading-relaxed text-pretty', TONE[tone].body)}>
        {EMPTY_TRAIL}
      </p>
    );
  }
  return (
    <ol className={cn('space-y-1.5 text-[11px] leading-relaxed', TONE[tone].body)}>
      {view.trail.map((item) => (
        <li key={item.id} className="text-pretty">
          {item.label}
        </li>
      ))}
    </ol>
  );
}

function TrailToggle({
  count,
  open,
  panelId,
  tone,
  onToggle,
}: {
  count: number;
  open: boolean;
  panelId: string;
  tone: PlanVivantTone;
  onToggle: () => void;
}) {
  return (
    <button
      aria-controls={panelId}
      aria-expanded={open}
      type="button"
      className={cn(
        'inline-flex min-h-9 items-center gap-1.5 rounded-md text-[11px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2',
        TONE[tone].body,
        TONE[tone].hover,
        TONE[tone].ring,
      )}
      onClick={onToggle}
    >
      Ce que le coaching a changé
      {count > 0 ? <span className="text-data tabular-nums">· {count}</span> : null}
      <NavArrowDown
        className={cn(
          'size-3 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
          open && 'rotate-180',
        )}
        aria-hidden
      />
    </button>
  );
}

function AdvancementHeader({
  view,
  tone,
  headlineId,
}: {
  view: GoalAdvancementView;
  tone: PlanVivantTone;
  headlineId: string;
}) {
  return (
    <div className="space-y-0.5">
      <h3 className={cn('text-card-title text-pretty', TONE[tone].title)} id={headlineId}>
        {view.headline}
      </h3>
      <p className={cn('text-[11px] leading-snug text-pretty', TONE[tone].body)}>
        {view.goalLabel ? `vers ${view.goalLabel} · ` : null}
        {view.why}
      </p>
    </div>
  );
}

/**
 * Suivi body — surface-agnostic so it can sit on the ink confirmation shells
 * without dragging a dark band onto Today.
 */
function AdvancementDisclosure({
  view,
  tone,
}: {
  view: GoalAdvancementView;
  tone: PlanVivantTone;
}) {
  const [trailOpen, setTrailOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <TrailToggle
          count={view.trail.length}
          open={trailOpen}
          panelId={panelId}
          tone={tone}
          onToggle={() => setTrailOpen(!trailOpen)}
        />
        <Link
          href={view.href}
          className={cn(
            'pressable inline-flex min-h-9 items-center gap-1 text-[11px] font-medium transition-colors duration-150',
            TONE[tone].link,
          )}
        >
          Voir l’objectif
          <span aria-hidden>→</span>
        </Link>
      </div>

      <MotionExpand id={panelId} open={trailOpen}>
        <div className="space-y-1.5 pt-0.5">
          <TrailList tone={tone} view={view} />
          {view.phaseLabel ? (
            <p className={cn('text-label', TONE[tone].faint)}>Phase · {view.phaseLabel}</p>
          ) : null}
        </div>
      </MotionExpand>
    </>
  );
}

function dividerClass(showDivider: boolean, tone: PlanVivantTone): string | false {
  return (
    showDivider &&
    cn('border-t pt-4', tone === 'ink' ? 'border-ink-surface-foreground/20' : 'border-border')
  );
}

export function PlanVivantAdvancementSection({
  view,
  className,
  showDivider = false,
  tone = 'ink',
}: {
  view: GoalAdvancementView;
  className?: string;
  showDivider?: boolean;
  tone?: PlanVivantTone;
}) {
  const headlineId = useId();

  return (
    <div className={cn('space-y-3', dividerClass(showDivider, tone), className)}>
      <AdvancementHeader headlineId={headlineId} tone={tone} view={view} />
      {view.progress !== null ? (
        <GoalProgressHairline progress={view.progress} tone={tone} />
      ) : null}

      <div className="space-y-1.5">
        <WeekMeter segments={view.weekSegments} tone={tone} />
        <WeekLegend segments={view.weekSegments} tone={tone} />
      </div>

      <AdvancementDisclosure tone={tone} view={view} />
    </div>
  );
}

export function PlanVivantEyebrow({
  goalLabel: _goalLabel,
  habitDriven = false,
  tone = 'ink',
}: {
  goalLabel?: string | null;
  habitDriven?: boolean;
  tone?: PlanVivantTone;
}) {
  void _goalLabel;
  return (
    <div className={cn('text-label inline-flex flex-wrap items-center gap-1.5', TONE[tone].faint)}>
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          tone === 'ink' ? 'bg-highlight dark:bg-ink-surface-foreground' : 'bg-primary',
        )}
        aria-hidden
      />
      <span>Plan vivant</span>
      {habitDriven ? <span className={TONE[tone].body}>· Journal</span> : null}
    </div>
  );
}

/**
 * Body of the Today instrument — the readout is the countdown, not a gauge, so
 * Plan vivant keeps its own identity inside the family chrome.
 */
/** « J-27 · Sub 6h » reads as a value and its unit, the way a score reads « 82 / sur 100 ». */
function splitHeadline(headline: string): { readout: string; unit: string | null } {
  const [readout, ...rest] = headline.split(' · ');
  return { readout: readout ?? headline, unit: rest.length > 0 ? rest.join(' · ') : null };
}

function PlanVivantInstrumentBody({ view }: { view: GoalAdvancementView }) {
  const { readout, unit } = splitHeadline(view.headline);

  return (
    <div className="mt-3 flex min-w-0 flex-1 flex-col gap-3">
      <div>
        <p className="text-data text-foreground text-2xl leading-none font-semibold tabular-nums">
          {readout}
        </p>
        {unit ? (
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug text-pretty">{unit}</p>
        ) : null}
      </div>

      <div className="mt-auto space-y-1.5 pt-1">
        {view.weekSegments.length > 0 ? (
          <>
            <WeekMeter segments={view.weekSegments} tone="plain" />
            <WeekLegend segments={view.weekSegments} tone="plain" />
          </>
        ) : (
          <p className="text-muted-foreground text-[11px] leading-snug text-pretty">{view.why}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Plan hub lab-note, or Today instrument card — same chrome as Score sommeil /
 * Score récupération, own body. Never the ink band: that belongs to the verdict.
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
      <TodayInstrumentCard
        className={className}
        href={view.href}
        icon={<Route className="size-3.5" strokeWidth={2.25} />}
        subtitle={view.goalLabel ? `vers ${view.goalLabel}` : null}
        title="Plan vivant"
        titleAttr="Voir l’objectif — Plan vivant"
      >
        <PlanVivantInstrumentBody view={view} />
      </TodayInstrumentCard>
    </FadeIn>
  );
}
