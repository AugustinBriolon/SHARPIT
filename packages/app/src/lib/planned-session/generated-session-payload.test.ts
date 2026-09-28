import { describe, expect, it } from 'vitest';
import { generatedSessionPayload, type GeneratedSessionInput } from './generated-session-payload';

const session: GeneratedSessionInput = {
  date: '2026-09-29',
  startTime: null,
  type: 'RUN',
  intensity: 'ENDURANCE',
  title: 'Footing',
  description: '',
  durationMin: 45,
  load: 40,
  decisionId: null,
};

describe('generatedSessionPayload', () => {
  it('writes the description from the steps, the coach writes none', () => {
    const payload = generatedSessionPayload(
      {
        ...session,
        endurancePrescription: {
          blocks: [
            { steps: [{ kind: 'warmup', minutes: 10, effort: 'RECOVERY' }] },
            { steps: [{ kind: 'interval', minutes: 30, effort: 'ENDURANCE' }] },
          ],
        },
      },
      null,
    );
    expect(payload.description).toBeTruthy();
    expect(payload.description).not.toBe('Footing');
    expect(payload.endurancePrescription?.blocks).toHaveLength(2);
  });

  it('falls back to the title when a session has no steps, so it can still be stored', () => {
    expect(generatedSessionPayload(session, null).description).toBe('Footing');
  });
});
