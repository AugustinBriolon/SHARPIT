import { describe, expect, it } from 'vitest';
import {
  buildAdaptDeepLink,
  buildFeedbackRearrangeProposal,
} from '@/lib/today/rich/feedback-rearrange-proposal';

const DAY = new Date('2026-08-25T12:00:00');

function upcoming(
  overrides: Partial<{
    id: string;
    date: string;
    intensity: 'RECOVERY' | 'ENDURANCE' | 'TEMPO' | 'THRESHOLD' | 'VO2MAX' | 'RACE' | null;
    completed: boolean;
  }> = {},
) {
  return {
    id: overrides.id ?? 's1',
    date: overrides.date ?? '2026-08-27T09:00:00',
    intensity: overrides.intensity === undefined ? ('THRESHOLD' as const) : overrides.intensity,
    completed: overrides.completed ?? false,
  };
}

describe('buildAdaptDeepLink', () => {
  it('opens PlanAdapter with focus query', () => {
    const href = buildAdaptDeepLink('Allège la semaine');
    expect(href.startsWith('/plan/semaine?')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('adapt')).toBe('1');
    expect(params.get('focus')).toBe('Allège la semaine');
  });
});

describe('buildFeedbackRearrangeProposal', () => {
  it('returns null when Twin is not fresh', () => {
    expect(
      buildFeedbackRearrangeProposal({
        phase: 'SESSION_COMPLETED',
        overallFresh: false,
        verdict: 'RECOVER',
        confidence: 0.8,
        day: DAY,
        upcoming: [upcoming()],
      }),
    ).toBeNull();
  });

  it('returns null without upcoming unfinished sessions', () => {
    expect(
      buildFeedbackRearrangeProposal({
        phase: 'SESSION_COMPLETED',
        overallFresh: true,
        verdict: 'RECOVER',
        confidence: 0.8,
        day: DAY,
        upcoming: [upcoming({ completed: true }), upcoming({ date: '2026-08-20T09:00:00' })],
      }),
    ).toBeNull();
  });

  it('proposes rearrange after session when protect + demanding upcoming', () => {
    const proposal = buildFeedbackRearrangeProposal({
      phase: 'SESSION_COMPLETED',
      overallFresh: true,
      verdict: 'CAUTION',
      confidence: 0.75,
      day: DAY,
      upcoming: [upcoming({ intensity: 'TEMPO' }), upcoming({ id: 's2', intensity: 'VO2MAX' })],
    });
    expect(proposal).toMatchObject({
      visible: true,
      trigger: 'POST_SESSION',
      ctaLabel: 'Proposer un rearrange',
    });
    expect(proposal?.href).toContain('adapt=1');
    expect(proposal?.focus.toLowerCase()).toContain('prudence');
  });

  it('proposes morning mismatch for protect + hard sessions from tomorrow', () => {
    const proposal = buildFeedbackRearrangeProposal({
      phase: 'MORNING',
      overallFresh: true,
      verdict: 'RECOVER',
      confidence: 0.9,
      day: DAY,
      upcoming: [
        upcoming({ id: 'today', date: '2026-08-25T18:00:00', intensity: 'THRESHOLD' }),
        upcoming({ id: 'tomorrow', date: '2026-08-26T09:00:00', intensity: 'THRESHOLD' }),
      ],
    });
    expect(proposal).toMatchObject({ visible: true, trigger: 'MORNING_MISMATCH' });
    // today-only hard would not count — tomorrow does
    expect(proposal?.why).toMatch(/1 séance/);
  });

  it('ignores today-only hard sessions in morning (owned by recalibration)', () => {
    expect(
      buildFeedbackRearrangeProposal({
        phase: 'MORNING',
        overallFresh: true,
        verdict: 'RECOVER',
        confidence: 0.9,
        day: DAY,
        upcoming: [upcoming({ date: '2026-08-25T18:00:00', intensity: 'VO2MAX' })],
      }),
    ).toBeNull();
  });

  it('proposes when push verdict meets only-easy upcoming', () => {
    const proposal = buildFeedbackRearrangeProposal({
      phase: 'RECOVERY_WINDOW',
      overallFresh: true,
      verdict: 'TRAIN_HARD',
      confidence: 0.85,
      day: DAY,
      upcoming: [upcoming({ intensity: 'ENDURANCE' }), upcoming({ id: 's2', intensity: null })],
    });
    expect(proposal).toMatchObject({
      visible: true,
      trigger: 'POST_SESSION',
      headline: 'Le plan est trop sage pour ton Twin',
    });
  });

  it('proposes after hard effort when hard sessions remain', () => {
    const proposal = buildFeedbackRearrangeProposal({
      phase: 'SESSION_COMPLETED',
      overallFresh: true,
      verdict: 'TRAIN_SMART',
      confidence: 0.7,
      day: DAY,
      upcoming: [upcoming({ intensity: 'THRESHOLD' })],
      latestEffort: { rpe: 9, feeling: 'ok' },
    });
    expect(proposal).toMatchObject({
      visible: true,
      trigger: 'POST_SESSION',
      headline: 'Séance dure intégrée — ajuster la suite ?',
    });
  });

  it('stays quiet for TRAIN_SMART without mismatch or hard effort', () => {
    expect(
      buildFeedbackRearrangeProposal({
        phase: 'SESSION_COMPLETED',
        overallFresh: true,
        verdict: 'TRAIN_SMART',
        confidence: 0.8,
        day: DAY,
        upcoming: [upcoming({ intensity: 'TEMPO' })],
        latestEffort: { rpe: 5, feeling: 'bien' },
      }),
    ).toBeNull();
  });

  it('requires usable confidence', () => {
    expect(
      buildFeedbackRearrangeProposal({
        phase: 'SESSION_COMPLETED',
        overallFresh: true,
        verdict: 'RECOVER',
        confidence: 0.4,
        day: DAY,
        upcoming: [upcoming()],
      }),
    ).toBeNull();
  });
});
