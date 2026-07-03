'use client';

import { cn } from '@/lib/utils';
import {
  mapConfidenceToTier,
  mapConsistencyToDisplay,
  type ConfidenceTier,
  type PhysiologicalConsistency,
} from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// Confidence tier bar (reused from narrative-header)
// ─────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_BARS: Record<ConfidenceTier, { filled: number; label: string }> = {
  high: { filled: 3, label: 'Confiance élevée' },
  medium: { filled: 2, label: 'Confiance moyenne' },
  low: { filled: 1, label: 'Données limitées' },
};

function ConfidenceBar({ tier, colorClass }: { tier: ConfidenceTier; colorClass: string }) {
  const { filled, label } = CONFIDENCE_BARS[tier];
  return (
    <span
      aria-label={label}
      className={cn('inline-flex items-center gap-1.5', colorClass)}
      title={label}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-1.5 rounded-full transition-opacity',
            i <= filled ? 'bg-current opacity-90' : 'bg-current opacity-20',
          )}
        />
      ))}
      <span className="text-xs font-medium">{label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfidenceBlock — Q8: How confident is SHARPIT?
// ─────────────────────────────────────────────────────────────────────────────

interface ConfidenceBlockProps {
  confidence: number;
  physiologicalConsistency: PhysiologicalConsistency;
  consistencyScore: number;
  dataCompleteness: string;
  availableModelCount: number;
}

export function ConfidenceBlock({
  confidence,
  physiologicalConsistency,
  consistencyScore,
  dataCompleteness,
  availableModelCount,
}: ConfidenceBlockProps) {
  const tier = mapConfidenceToTier(confidence);
  const consistency = mapConsistencyToDisplay(physiologicalConsistency, consistencyScore);

  return (
    <div className="bg-card/40 space-y-3 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        Confiance de SHARPIT
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ConfidenceBar colorClass={consistency.colorClass} tier={tier} />
        <span className={cn('text-xs font-medium', consistency.colorClass)}>
          {consistency.label}
        </span>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span>{availableModelCount}/3 signaux physiologiques</span>
        {dataCompleteness && <span>{dataCompleteness}</span>}
      </div>
    </div>
  );
}
