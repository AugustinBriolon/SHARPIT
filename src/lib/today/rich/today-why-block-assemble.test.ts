import { describe, expect, it } from 'vitest';
import { assembleTodayWhyBlock } from '@/lib/today/rich/today-why-block-assemble';

describe('assembleTodayWhyBlock', () => {
  it('stays hidden when only posture facts exist', () => {
    const block = assembleTodayWhyBlock({
      phase: 'MORNING',
      whyFacts: [{ label: 'Pourquoi', value: 'Garde de la marge', hint: 'charge légère' }],
      goalContext: null,
    });
    expect(block.visible).toBe(false);
    expect(block.facts).toEqual([]);
  });

  it('surfaces session→goal and drops posture restatement', () => {
    const block = assembleTodayWhyBlock({
      phase: 'BEFORE_SESSION',
      whyFacts: [
        { label: 'Pourquoi', value: 'Prudence', hint: 'signaux à ne pas forcer' },
        { label: 'Signaux', value: 'Divergents', hint: 'ressenti ≠ mesures' },
      ],
      goalContext: {
        goalId: 'g1',
        title: 'Semi Lyon',
        badge: 'J-12',
        linkedToTodaySession: true,
        isPrimaryRace: true,
        daysUntil: 12,
      },
    });

    expect(block.visible).toBe(true);
    expect(block.title).toBe('Contexte avant séance');
    expect(block.facts[0]).toEqual({
      label: 'Séance',
      value: 'Sert Semi Lyon',
      hint: 'J-12',
    });
    expect(block.facts.map((f) => f.label)).toEqual(['Séance', 'Signaux']);
  });

  it('shows non-goal evidence when signals diverge without session link', () => {
    const block = assembleTodayWhyBlock({
      phase: 'MORNING',
      whyFacts: [
        { label: 'Pourquoi', value: 'Fenêtre haute' },
        { label: 'Signaux', value: 'Partiels' },
      ],
      goalContext: {
        goalId: 'g1',
        title: 'Semi',
        badge: 'J-40',
        linkedToTodaySession: false,
        isPrimaryRace: true,
        daysUntil: 40,
      },
    });

    expect(block.visible).toBe(true);
    expect(block.facts).toEqual([{ label: 'Signaux', value: 'Partiels' }]);
  });

  it('surfaces habit journal fact after session→goal and before other signals', () => {
    const block = assembleTodayWhyBlock({
      phase: 'MORNING',
      whyFacts: [{ label: 'Signaux', value: 'Divergents' }],
      goalContext: {
        goalId: 'g1',
        title: 'Semi Lyon',
        badge: 'J-12',
        linkedToTodaySession: true,
        isPrimaryRace: true,
        daysUntil: 12,
      },
      habitFact: {
        label: 'Journal',
        value: 'Quand tu notes « Repas tardif », sommeil est souvent plus bas.',
        hint: 'Association nette',
      },
    });

    expect(block.visible).toBe(true);
    expect(block.facts.map((f) => f.label)).toEqual(['Séance', 'Journal', 'Signaux']);
  });
});
