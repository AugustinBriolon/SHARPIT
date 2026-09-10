import { describe, expect, it } from 'vitest';
import { formatJournalAnalysesCoachBlock } from '@/lib/coach/chat/discuss/journal-analyses-coach-gate';
import type { JournalHabitReading } from '@/lib/health/journal-habit-reading';

function reading(overrides: Partial<JournalHabitReading> = {}): JournalHabitReading {
  return {
    daysWithSignal: 14,
    netCount: 1,
    weakCount: 1,
    empty: false,
    headline: '1 association nette · pistes à confirmer',
    summary: '14 jours analysés · 1 nette · 1 à confirmer',
    priority: {
      factorId: 'device_in_bed',
      polarity: 'minus',
      confidence: 'high',
      title: 'Écran au lit · sommeil plus bas',
      detail: 'Médiane avec vs sans : sommeil 6 h 10 vs 7 h 30 · 6/8 j.',
    } as NonNullable<JournalHabitReading['priority']>,
    highlights: [
      {
        factorId: 'device_in_bed',
        title: 'Écran au lit · sommeil plus bas',
        polarity: 'minus',
        confidence: 'high',
      },
      {
        factorId: 'late_meal',
        title: 'Repas tardif · récupération plus basse',
        polarity: 'minus',
        confidence: 'medium',
      },
    ],
    actionHint:
      'Teste 7 jours sans « Écran au lit » (ou en réduisant), puis compare sommeil et récupération.',
    ...overrides,
  };
}

describe('formatJournalAnalysesCoachBlock', () => {
  it('hands the coach the priority, the other associations and the no-causation rule', () => {
    const block = formatJournalAnalysesCoachBlock(reading());

    expect(block).toContain('## Analyses journal');
    expect(block).toContain('pas des causes');
    expect(block).toContain('Priorité : Écran au lit · sommeil plus bas (Association nette).');
    expect(block).toContain('- Repas tardif · récupération plus basse (À confirmer)');
    // The priority is not repeated in the « others » list.
    expect(block.match(/Écran au lit · sommeil plus bas/g)).toHaveLength(1);
  });

  it('tells the coach not to invent associations before the analysis unlocks', () => {
    const block = formatJournalAnalysesCoachBlock(reading({ daysWithSignal: 3 }));

    expect(block).toContain('3/7 jours avec signal');
    expect(block).not.toContain('Priorité');
  });

  it('says so plainly when there is nothing usable', () => {
    const block = formatJournalAnalysesCoachBlock(
      reading({ empty: true, netCount: 0, weakCount: 0, priority: null, highlights: [] }),
    );

    expect(block).toContain('Aucune association exploitable');
    expect(block).not.toContain('Priorité');
  });
});
