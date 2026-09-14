'use client';

import { useState, type ReactNode } from 'react';
import { Clock3, Crosshair, Dumbbell, Gauge } from 'lucide-react';
import { ExpertOnly } from '@/components/display-mode';
import { GoalCapStatDetailDialog } from '@/components/goals/cap/goal-cap-stat-detail-dialog';
import { FadeIn } from '@/components/motion/fade-presence';
import {
  buildCapStatDetail,
  type CapStatDetail,
  type CapStatKind,
} from '@/lib/goals/goal-cap-stat-detail';
import type { GoalCapStatsView } from '@/lib/goals/goal-cap-stats';
import type { GoalPositionAuditView } from '@/lib/goals/goal-position-audit';
import { cn } from '@/lib/utils';

function StatInstrumentTrigger({
  hint,
  icon,
  label,
  onOpen,
  value,
}: {
  label: string;
  value: string;
  hint: string | null;
  icon: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      className="chip-surface-lg focus-visible:ring-primary/35 rounded-2xl px-3.5 py-3 text-left transition-[transform,opacity] duration-150 ease-out focus-visible:ring-2 focus-visible:outline-hidden active:scale-[0.98]"
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-tight">{label}</p>
        <span className="icon-well size-7 shrink-0" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="text-data text-foreground mt-2 text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="text-muted-foreground mt-1 text-[11px] leading-snug">{hint}</p> : null}
    </button>
  );
}

function sessionHint(stats: GoalCapStatsView): string {
  if (!stats.hasLinkedSessions) {
    return 'Aucune séance liée pour l’instant';
  }
  const [top] = stats.sportShares;
  if (top) {
    return `Mix : ${top.label} en tête`;
  }
  return 'Depuis le début du cap';
}

function durationHint(stats: GoalCapStatsView): string {
  const [top] = stats.sportShares;
  if (top && stats.durationSeconds > 0) {
    return `Mix : ${top.label} en tête`;
  }
  return 'Temps consacré';
}

function CapStatGrid({
  onOpen,
  position,
  stats,
}: {
  stats: GoalCapStatsView;
  position: GoalPositionAuditView | null;
  onOpen: (kind: CapStatKind) => void;
}) {
  return (
    <section
      aria-label="Volume et positionnement vers l’objectif"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      <StatInstrumentTrigger
        hint={sessionHint(stats)}
        icon={<Dumbbell className="size-3.5" strokeWidth={2.25} />}
        label="Séances"
        value={String(stats.sessionsDone)}
        onOpen={() => onOpen('sessions')}
      />
      <StatInstrumentTrigger
        hint={durationHint(stats)}
        icon={<Clock3 className="size-3.5" strokeWidth={2.25} />}
        label="Durée"
        value={stats.durationLabel}
        onOpen={() => onOpen('duration')}
      />
      <ExpertOnly>
        <StatInstrumentTrigger
          hint={stats.loadLabel ? 'Charge cumulée' : 'Pas encore de charge'}
          icon={<Gauge className="size-3.5" strokeWidth={2.25} />}
          label="TSS"
          value={stats.loadLabel ?? '—'}
          onOpen={() => onOpen('load')}
        />
      </ExpertOnly>
      <StatInstrumentTrigger
        hint={position?.hint ?? 'Cible vs projection'}
        icon={<Crosshair className="size-3.5" strokeWidth={2.25} />}
        label="Position"
        value={position?.value ?? '—'}
        onOpen={() => onOpen('position')}
      />
    </section>
  );
}

/**
 * Goal-scoped volume + position audit — instruments open a detail modal.
 * TSS is Expert-only (ADR-023). Equal chip surfaces — no tone washes.
 */
export function GoalCapStats({
  className,
  position,
  stats,
}: {
  stats: GoalCapStatsView;
  position: GoalPositionAuditView | null;
  className?: string;
}) {
  const [detail, setDetail] = useState<CapStatDetail | null>(null);

  return (
    <FadeIn>
      <div className={cn(className)}>
        <CapStatGrid
          position={position}
          stats={stats}
          onOpen={(kind) => setDetail(buildCapStatDetail({ kind, stats, position }))}
        />
      </div>
      <GoalCapStatDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </FadeIn>
  );
}

export function GoalCapStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-busy>
      <div className="chip-surface-lg h-24 animate-pulse rounded-2xl" />
      <div className="chip-surface-lg h-24 animate-pulse rounded-2xl" />
      <div className="chip-surface-lg h-24 animate-pulse rounded-2xl" />
      <ExpertOnly>
        <div className="chip-surface-lg h-24 animate-pulse rounded-2xl" />
      </ExpertOnly>
    </div>
  );
}
