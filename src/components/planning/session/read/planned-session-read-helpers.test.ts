import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import type { ClientPlannedSession } from '@/lib/query/types';
import { buildRealizedSessionChips } from '@/components/planning/session/read/planned-session-read-helpers';

describe('buildRealizedSessionChips', () => {
  it('formats plan → done values when activity is linked', () => {
    const chips = buildRealizedSessionChips({
      mode: 'expert',
      session: {
        id: 'ps-1',
        type: ActivityType.RUN,
        durationMin: 60,
        load: 80,
        intensity: 'TEMPO',
        activity: {
          duration: 3480,
          load: 86,
          rpe: 7,
          feeling: null,
        },
      } as ClientPlannedSession,
    });

    expect(chips[0]?.value).toContain('60 min');
    expect(chips[0]?.value).toContain('58 min');
    expect(chips[2]?.value).toContain('RPE 7');
  });
});
