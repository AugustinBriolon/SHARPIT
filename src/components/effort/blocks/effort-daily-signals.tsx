'use client';

import { TermInfo } from '@/components/ui/term-info';
import type { EffortDailySignals } from '@/lib/presentation/effort-strain-composition';
import type { GlossaryKey } from '@/lib/glossary';

type SignalCard = {
  key: GlossaryKey;
  label: string;
  value: string | null;
  unit: string | null;
};

/**
 * What the day actually cost, outside training.
 *
 * These three were reachable only as a sentence inside a folded "Détail" block —
 * a day spent on your feet with a stress score of 70 is a real reason the legs
 * feel heavy, and it was the least visible thing on the screen. No scale is drawn
 * on them: none of the three has a personal baseline yet, and a band invented for
 * the layout would read as a norm the athlete does not have.
 */
export function EffortDailySignalsCards({ signals }: { signals: EffortDailySignals }) {
  const cards: SignalCard[] = [
    {
      key: 'steps',
      label: 'Pas',
      value: signals.steps !== null ? signals.steps.toLocaleString('fr-FR') : null,
      unit: null,
    },
    {
      key: 'stress',
      label: 'Stress',
      value: signals.stress !== null ? String(Math.round(signals.stress)) : null,
      unit: '/100',
    },
    {
      key: 'bodyBattery',
      label: 'Batterie',
      value: signals.bodyBattery !== null ? String(Math.round(signals.bodyBattery)) : null,
      unit: 'énergie',
    },
  ];

  if (cards.every((card) => card.value === null)) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="border-analysis-border/60 bg-background/40 rounded-analysis border p-3"
        >
          <span className="text-muted-foreground flex items-center gap-1 text-sm">
            <span className="truncate">{card.label}</span>
            <TermInfo term={card.key} />
          </span>

          <span className="mt-1 flex items-baseline gap-1">
            <span className="text-data text-primary text-2xl font-semibold tabular-nums">
              {card.value ?? '—'}
            </span>
            {card.unit ? <span className="text-muted-foreground text-xs">{card.unit}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
