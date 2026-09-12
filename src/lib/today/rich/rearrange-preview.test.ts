import { describe, expect, it } from 'vitest';
import { buildRearrangePreviewSessions } from '@/lib/today/rich/rearrange-preview';
import { buildFeedbackRearrangeProposal } from '@/lib/today/rich/feedback-rearrange-proposal';

const DAY = new Date('2026-08-25T12:00:00');

describe('buildRearrangePreviewSessions', () => {
  it('marks demanding sessions as tension for protect kind', () => {
    const chips = buildRearrangePreviewSessions(
      [
        {
          id: 'a',
          date: '2026-08-26T09:00:00',
          intensity: 'THRESHOLD',
          completed: false,
        },
        {
          id: 'b',
          date: '2026-08-27T09:00:00',
          intensity: 'ENDURANCE',
          completed: false,
        },
      ],
      'protect',
    );
    expect(chips).toHaveLength(2);
    expect(chips[0]).toMatchObject({ id: 'a', tone: 'tension', intensityLabel: 'Seuil' });
    expect(chips[1]).toMatchObject({ id: 'b', tone: 'neutral' });
  });

  it('marks easy sessions as calm for push kind', () => {
    const chips = buildRearrangePreviewSessions(
      [
        {
          id: 'a',
          date: '2026-08-26T09:00:00',
          intensity: 'RECOVERY',
          completed: false,
        },
      ],
      'push',
    );
    expect(chips[0]?.tone).toBe('calm');
  });
});

describe('feedback rearrange preview payload', () => {
  it('includes kind and preview chips on protect mismatch', () => {
    const proposal = buildFeedbackRearrangeProposal({
      phase: 'SESSION_COMPLETED',
      overallFresh: true,
      verdict: 'CAUTION',
      confidence: 0.8,
      day: DAY,
      upcoming: [
        {
          id: 's1',
          date: '2026-08-27T09:00:00',
          intensity: 'TEMPO',
          completed: false,
        },
      ],
    });
    expect(proposal?.kind).toBe('protect');
    expect(proposal?.previewSessions.length).toBeGreaterThan(0);
    expect(proposal?.previewSessions[0]?.tone).toBe('tension');
  });
});
