'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  mapRecoveryToSignal,
  mapFatigueToSignal,
  mapAdaptationToSignal,
  mapRecoveryIntensityLabel,
  mapFatigueCapacityLabel,
  type ReadinessCategory,
  type FatigueLevel,
  type FatigueTrajectory,
  type AdaptationStatus,
  type AdaptationTrend,
  type RecommendedIntensity,
  type TrainingCapacity,
} from '@/lib/today-mapping';
import { resolve } from '@/lib/french';
import type { RecoveryData, FatigueData, AdaptationData } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// SupportingEvidenceBlock — physiological detail, collapsed by default
// ─────────────────────────────────────────────────────────────────────────────

function StatusChip({
  label,
  arrow,
  qualityClass,
}: {
  label: string;
  arrow: string;
  qualityClass: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', qualityClass)}>
      {label}
      <span className="text-[10px]">{arrow}</span>
    </span>
  );
}

function EvidencePanel({
  title,
  statusChip,
  intensityLabel,
  evidence,
}: {
  title: string;
  statusChip: React.ReactNode;
  intensityLabel?: string;
  evidence?: string[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
          {title}
        </p>
        {statusChip}
      </div>
      {intensityLabel && <p className="text-muted-foreground text-xs">{intensityLabel}</p>}
      {evidence && evidence.length > 0 && (
        <ul className="space-y-0.5">
          {evidence.slice(0, 3).map((e, i) => (
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
  );
}

interface SupportingEvidenceBlockProps {
  recovery: RecoveryData | null;
  fatigue: FatigueData | null;
  adaptation: AdaptationData | null;
}

export function SupportingEvidenceBlock({
  recovery,
  fatigue,
  adaptation,
}: SupportingEvidenceBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!recovery && !fatigue && !adaptation) return null;

  const recoverySignal = recovery
    ? mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory)
    : null;
  const fatigueSignal =
    recovery && fatigue
      ? mapFatigueToSignal(
          fatigue.fatigueLevel as FatigueLevel,
          fatigue.trajectory as FatigueTrajectory,
        )
      : null;
  const adaptationSignal = adaptation
    ? mapAdaptationToSignal(
        adaptation.adaptationStatus as AdaptationStatus,
        adaptation.adaptationTrend as AdaptationTrend,
      )
    : null;

  return (
    <div className="bg-card/40 rounded-2xl border px-5 py-4">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2"
        type="button"
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Détail physiologique
        </p>
        <span
          className={cn(
            'text-muted-foreground text-xs transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        >
          ↓
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {recovery && recoverySignal?.isAvailable && (
            <EvidencePanel
              evidence={recovery.recommendation.keyEvidence.map((e) => resolve(e))}
              title="Récupération"
              intensityLabel={mapRecoveryIntensityLabel(
                recovery.decision.recommendedIntensity as RecommendedIntensity,
              )}
              statusChip={
                <StatusChip
                  arrow={recoverySignal.arrow}
                  label={recoverySignal.label}
                  qualityClass={recoverySignal.qualityClass}
                />
              }
            />
          )}

          {fatigue && fatigueSignal?.isAvailable && (
            <EvidencePanel
              evidence={fatigue.recommendation.keyEvidence.map((e) => resolve(e))}
              intensityLabel={mapFatigueCapacityLabel(fatigue.trainingCapacity as TrainingCapacity)}
              title="Fatigue"
              statusChip={
                <StatusChip
                  arrow={fatigueSignal.arrow}
                  label={fatigueSignal.label}
                  qualityClass={fatigueSignal.qualityClass}
                />
              }
            />
          )}

          {adaptation && adaptationSignal?.isAvailable && (
            <EvidencePanel
              evidence={adaptation.recommendation.keyEvidence.map((e) => resolve(e))}
              title="Adaptation"
              statusChip={
                <StatusChip
                  arrow={adaptationSignal.arrow}
                  label={adaptationSignal.label}
                  qualityClass={adaptationSignal.qualityClass}
                />
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
