'use client';

import type { LimitingFactor } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// BottleneckBlock — Q7: Which physiological system is limiting me?
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_LABEL: Record<string, string> = {
  RECOVERY: 'Recovery',
  FATIGUE: 'Fatigue',
  ADAPTATION: 'Adaptation',
};

interface BottleneckBlockProps {
  limitingFactor: LimitingFactor;
}

export function BottleneckBlock({ limitingFactor }: BottleneckBlockProps) {
  if (!limitingFactor.system && !limitingFactor.description) return null;

  return (
    <div className="bg-card/60 space-y-2 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        What&apos;s limiting you
      </p>

      {limitingFactor.system && (
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          {SYSTEM_LABEL[limitingFactor.system] ?? limitingFactor.system}
        </p>
      )}

      {limitingFactor.description && (
        <p className="text-sm leading-relaxed">{limitingFactor.description}</p>
      )}

      {limitingFactor.actionable && (
        <p className="text-muted-foreground text-xs">
          Actionable — focus here for the fastest improvement.
        </p>
      )}
    </div>
  );
}
