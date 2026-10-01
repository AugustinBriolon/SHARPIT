import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrickEvaluationSummary, brickEvaluationReadings } from './brick-evaluation-summary';

const EVALUATION = {
  brickGroupId: 'brick-1',
  rpe: 7,
  transitionRating: 4,
  feeling: 'Bien',
  notes: 'T2 rapide',
  updatedAt: '2026-10-01T08:00:00.000Z',
};

describe('brickEvaluationReadings', () => {
  it('reads every answer with its anchor', () => {
    expect(brickEvaluationReadings(EVALUATION)).toEqual([
      { label: 'Ressenti', value: 'Bien' },
      { label: 'RPE global', value: '7/10 · Très dur' },
      { label: 'Transitions', value: '4/5 · Bonnes' },
    ]);
  });

  it('leaves out the scales the athlete did not answer', () => {
    expect(
      brickEvaluationReadings({ ...EVALUATION, rpe: null, transitionRating: null, feeling: null }),
    ).toEqual([]);
    expect(brickEvaluationReadings(null)).toEqual([]);
  });
});

describe('BrickEvaluationSummary', () => {
  it('invites a first evaluation when there is none', () => {
    const html = renderToStaticMarkup(
      createElement(BrickEvaluationSummary, {
        evaluation: null,
        disabled: false,
        onEdit: () => {},
      }),
    );
    expect(html).toContain('Évaluer le brick');
  });

  it('shows the answers and the notes once given', () => {
    const html = renderToStaticMarkup(
      createElement(BrickEvaluationSummary, {
        evaluation: EVALUATION,
        disabled: false,
        onEdit: () => {},
      }),
    );
    expect(html).toContain('Modifier');
    expect(html).toContain('4/5 · Bonnes');
    expect(html).toContain('T2 rapide');
  });
});
