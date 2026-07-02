'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  mapRecoveryToSignal,
  mapFatigueToSignal,
  mapAdaptationToSignal,
  type ReadinessCategory,
  type FatigueLevel,
  type FatigueTrajectory,
  type AdaptationStatus,
  type AdaptationTrend,
  type DimensionSignal,
} from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// Dimension card
// ─────────────────────────────────────────────────────────────────────────────

interface DimensionCardProps {
  name: string;
  signal: DimensionSignal;
  expandedDetail?: string;
}

function DimensionCard({ name, signal, expandedDetail }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      aria-expanded={expanded}
      aria-label={`${name}: ${signal.label}${signal.isAvailable ? '' : ' — data unavailable'}`}
      type="button"
      className={cn(
        'bg-card/60 flex min-w-0 flex-1 flex-col gap-2 rounded-xl border px-4 py-4 text-left',
        'hover:bg-card/80 transition-colors',
        !signal.isAvailable && 'opacity-60',
      )}
      onClick={() => signal.isAvailable && expandedDetail && setExpanded((v) => !v)}
    >
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        {name}
      </p>

      <div className="flex items-baseline gap-2">
        <span className={cn('text-lg font-semibold', signal.qualityClass)}>{signal.label}</span>
        <span
          className={cn(
            'text-sm font-medium',
            signal.arrowDirection === 'up' && 'text-emerald-500',
            signal.arrowDirection === 'down' && 'text-red-500',
            signal.arrowDirection === 'neutral' && 'text-muted-foreground',
          )}
          aria-hidden
        >
          {signal.arrow}
        </span>
      </div>

      {expanded && expandedDetail && (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{expandedDetail}</p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insufficient data placeholder (spec: "building model" state)
// ─────────────────────────────────────────────────────────────────────────────

function BuildingModelCard({ name, daysNeeded }: { name: string; daysNeeded?: number }) {
  return (
    <div className="bg-card/30 flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-dashed px-4 py-4 opacity-60">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        {name}
      </p>
      <p className="text-muted-foreground text-sm font-medium">Building model</p>
      {daysNeeded && (
        <p className="text-muted-foreground text-xs">{daysNeeded} more days of data needed</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone B — State Summary
// ─────────────────────────────────────────────────────────────────────────────

interface StateSummaryZoneProps {
  recovery: {
    readinessCategory: ReadinessCategory;
    readinessScore: number | null;
  } | null;
  fatigue: {
    fatigueLevel: FatigueLevel;
    trajectory: FatigueTrajectory;
  } | null;
  adaptation: {
    adaptationStatus: AdaptationStatus;
    adaptationTrend: AdaptationTrend;
  } | null;
}

export function StateSummaryZone({ recovery, fatigue, adaptation }: StateSummaryZoneProps) {
  const recoverySignal = recovery ? mapRecoveryToSignal(recovery.readinessCategory) : null;

  const fatigueSignal = fatigue
    ? mapFatigueToSignal(fatigue.fatigueLevel, fatigue.trajectory)
    : null;

  const adaptationSignal = adaptation
    ? mapAdaptationToSignal(adaptation.adaptationStatus, adaptation.adaptationTrend)
    : null;

  const recoveryDetail =
    recovery?.readinessScore != null
      ? `Readiness score: ${recovery.readinessScore}/100`
      : undefined;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-[0.15em] uppercase">
        Your state today
      </p>
      <div className="flex flex-wrap gap-3">
        {recoverySignal ? (
          <DimensionCard expandedDetail={recoveryDetail} name="Recovery" signal={recoverySignal} />
        ) : (
          <BuildingModelCard name="Recovery" />
        )}

        {fatigueSignal ? (
          <DimensionCard name="Fatigue" signal={fatigueSignal} />
        ) : (
          <BuildingModelCard name="Fatigue" />
        )}

        {adaptationSignal ? (
          <DimensionCard name="Adaptation" signal={adaptationSignal} />
        ) : (
          <BuildingModelCard daysNeeded={14} name="Adaptation" />
        )}
      </div>
    </div>
  );
}
