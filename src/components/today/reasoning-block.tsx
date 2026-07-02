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
} from '@/lib/today-mapping';
import type { KeyFinding } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Inline dimension badge (Recovery / Fatigue / Adaptation as evidence)
// ─────────────────────────────────────────────────────────────────────────────

function DimensionBadge({
  label,
  value,
  arrow,
  colorClass,
}: {
  label: string;
  value: string;
  arrow: string;
  colorClass: string;
}) {
  return (
    <span className="bg-background/60 flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', colorClass)}>{value}</span>
      <span className={cn('text-[10px]', colorClass)}>{arrow}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity indicator dot
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  WARNING: 'bg-amber-500',
  INFO: 'bg-muted-foreground/50',
};

const SEVERITY_TEXT: Record<string, string> = {
  CRITICAL: 'text-red-600 dark:text-red-400',
  WARNING: 'text-amber-600 dark:text-amber-400',
  INFO: 'text-foreground',
};

// ─────────────────────────────────────────────────────────────────────────────
// ReasoningBlock — Q2: Why?
// ─────────────────────────────────────────────────────────────────────────────

interface DimensionSignals {
  readinessCategory: ReadinessCategory;
  fatigueLevel: FatigueLevel;
  fatigueTrajectory: FatigueTrajectory;
  adaptationStatus: AdaptationStatus;
  adaptationTrend: AdaptationTrend;
}

interface ReasoningBlockProps {
  keyFindings: KeyFinding[];
  explanation: string;
  dimensions: DimensionSignals | null;
}

export function ReasoningBlock({ keyFindings, explanation, dimensions }: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const [primary, ...rest] = keyFindings;
  const supporting = rest.slice(0, 4);

  const recoverySignal = dimensions ? mapRecoveryToSignal(dimensions.readinessCategory) : null;
  const fatigueSignal = dimensions
    ? mapFatigueToSignal(dimensions.fatigueLevel, dimensions.fatigueTrajectory)
    : null;
  const adaptationSignal = dimensions
    ? mapAdaptationToSignal(dimensions.adaptationStatus, dimensions.adaptationTrend)
    : null;

  return (
    <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        Why this?
      </p>

      {/* Primary finding */}
      {primary && (
        <div>
          <p
            className={cn(
              'text-sm leading-snug font-medium',
              SEVERITY_TEXT[primary.severity] ?? 'text-foreground',
            )}
          >
            {primary.title}
          </p>
          {primary.evidence.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {primary.evidence.map((e, i) => (
                <li
                  key={i}
                  className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dimension signals — physiological evidence */}
      {(recoverySignal?.isAvailable ||
        fatigueSignal?.isAvailable ||
        adaptationSignal?.isAvailable) && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {recoverySignal?.isAvailable && (
            <DimensionBadge
              arrow={recoverySignal.arrow}
              colorClass={recoverySignal.qualityClass}
              label="Recovery"
              value={recoverySignal.label}
            />
          )}
          {fatigueSignal?.isAvailable && (
            <DimensionBadge
              arrow={fatigueSignal.arrow}
              colorClass={fatigueSignal.qualityClass}
              label="Fatigue"
              value={fatigueSignal.label}
            />
          )}
          {adaptationSignal?.isAvailable && (
            <DimensionBadge
              arrow={adaptationSignal.arrow}
              colorClass={adaptationSignal.qualityClass}
              label="Adaptation"
              value={adaptationSignal.label}
            />
          )}
        </div>
      )}

      {/* Expand toggle */}
      {(supporting.length > 0 || explanation) && (
        <button
          aria-expanded={expanded}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
          type="button"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'More detail'}
          <span className={cn('transition-transform', expanded && 'rotate-180')} aria-hidden>
            ↓
          </span>
        </button>
      )}

      {/* Expanded: supporting findings + explanation */}
      {expanded && (
        <div className="space-y-3 border-t pt-3">
          {supporting.length > 0 && (
            <ul className="space-y-2">
              {supporting.map((f) => (
                <li key={f.id} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      SEVERITY_DOT[f.severity],
                    )}
                  />
                  <span className="text-muted-foreground text-xs leading-relaxed">{f.title}</span>
                </li>
              ))}
            </ul>
          )}
          {explanation && (
            <p className="text-muted-foreground text-xs leading-relaxed">{explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
