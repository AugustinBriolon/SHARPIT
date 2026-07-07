import { describe, expect, it } from 'vitest';
import {
  buildProgressionSummary,
  buildTopActionLine,
  buildWhyEvidence,
  canTrainHardAnswer,
  verdictHeadline,
} from './today-rich-view';
import type { ReasoningData } from '@/hooks/use-today';

describe('today-rich-view', () => {
  it('buildTopActionLine resolves verb and focus', () => {
    const line = buildTopActionLine({
      verbCode: 'reasoning.topAction.trainSmart.verb',
      focusCode: 'reasoning.topAction.trainSmart.focus',
      rationaleCode: 'reasoning.topAction.trainSmart.rationale',
      expectedBenefit: 0.5,
    });
    expect(line).toContain('Entraîne-toi');
  });

  it('buildWhyEvidence prefers keyFindings over briefing', () => {
    const reasoning = {
      keyFindings: [
        {
          id: '1',
          category: 'recovery',
          severity: 'MODERATE',
          title: { code: 'reasoning.finding.lowHrv.title', params: {} },
          evidenceItems: [{ code: 'reasoning.finding.lowHrv.evidence', params: {} }],
          confidence: 0.8,
        },
      ],
      topAction: null,
    } as unknown as ReasoningData;

    const lines = buildWhyEvidence(
      reasoning,
      'Briefing LLM qui ne devrait pas apparaître en premier.',
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).not.toContain('Briefing LLM');
  });

  it('buildWhyEvidence falls back to briefing', () => {
    const lines = buildWhyEvidence(null, 'Premier paragraphe.\nDeuxième paragraphe.');
    expect(lines).toEqual(['Premier paragraphe.', 'Deuxième paragraphe.']);
  });

  it('verdictHeadline is honest when not actionable', () => {
    expect(verdictHeadline('TRAIN_HARD', false)).toBe('Pas encore de verdict fiable');
    expect(verdictHeadline('TRAIN_HARD', true)).toBe('Entraîne-toi fort');
  });

  it('canTrainHardAnswer maps verdicts', () => {
    expect(canTrainHardAnswer('RECOVER', true)).toContain('Non');
    expect(canTrainHardAnswer('TRAIN_HARD', true)).toContain('Oui');
    expect(canTrainHardAnswer('TRAIN_HARD', false)).toContain('pas encore');
  });

  it('buildProgressionSummary handles insufficient adaptation', () => {
    const summary = buildProgressionSummary(null, 120);
    expect(summary.detail).toBe('120 TSS cette semaine');
  });
});
