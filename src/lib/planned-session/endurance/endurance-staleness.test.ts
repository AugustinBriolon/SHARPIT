import { describe, expect, it } from 'vitest';
import type { EndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import {
  garminPushStaleness,
  parsePushedThresholds,
  thresholdKeysUsedBy,
} from '@/lib/planned-session/endurance/endurance-staleness';

/** 4 × 1000 m at threshold — depends on threshold pace and nothing else. */
function paceSession(): EndurancePrescription {
  return {
    version: 1,
    sport: 'RUN',
    blocks: [
      {
        kind: 'repeat',
        iterations: 4,
        steps: [
          {
            kind: 'interval',
            duration: { type: 'distance', meters: 1000 },
            target: { metric: 'pace', pctMin: 97.5, pctMax: 102.5 },
          },
        ],
      },
    ],
  };
}

describe('thresholdKeysUsedBy', () => {
  it('reports only the references the targets actually depend on', () => {
    expect(thresholdKeysUsedBy(paceSession())).toEqual(['runThresholdPaceSecPerKm']);
  });

  it('ignores steps pinned to an absolute override', () => {
    const prescription = paceSession();
    prescription.blocks[0] = {
      kind: 'step',
      step: {
        kind: 'interval',
        duration: { type: 'time', seconds: 600 },
        target: { metric: 'pace', pctMin: 97.5, pctMax: 102.5, absEasy: 250, absHard: 240 },
      },
    };
    expect(thresholdKeysUsedBy(prescription)).toEqual([]);
  });

  it('covers both heart-rate references when the anchor is automatic', () => {
    const prescription: EndurancePrescription = {
      version: 1,
      sport: 'RUN',
      blocks: [
        {
          kind: 'step',
          step: {
            kind: 'interval',
            duration: { type: 'time', seconds: 600 },
            target: { metric: 'hr', hrRef: 'auto', pctMin: 90, pctMax: 100 },
          },
        },
      ],
    };
    expect(thresholdKeysUsedBy(prescription).sort()).toEqual(['lthr', 'maxHr']);
  });
});

describe('garminPushStaleness', () => {
  const current = {
    runThresholdPaceSecPerKm: 232,
    ftpW: 250,
    lthr: 165,
    maxHr: 190,
  };

  it('flags a pushed session whose threshold pace moved', () => {
    const result = garminPushStaleness({
      prescription: paceSession(),
      pushedThresholds: { ...current, runThresholdPaceSecPerKm: 240 },
      currentThresholds: current,
      hasPush: true,
    });

    expect(result.stale).toBe(true);
    expect(result.changed).toEqual([{ key: 'runThresholdPaceSecPerKm', from: 240, to: 232 }]);
  });

  it('ignores a threshold the session does not use', () => {
    const result = garminPushStaleness({
      prescription: paceSession(),
      pushedThresholds: { ...current, ftpW: 200 },
      currentThresholds: current,
      hasPush: true,
    });
    expect(result.stale).toBe(false);
  });

  it('stays fresh when nothing was pushed', () => {
    const result = garminPushStaleness({
      prescription: paceSession(),
      pushedThresholds: null,
      currentThresholds: current,
      hasPush: false,
    });
    expect(result.stale).toBe(false);
  });
});

describe('parsePushedThresholds', () => {
  it('degrades unusable values to null instead of throwing', () => {
    expect(parsePushedThresholds({ runThresholdPaceSecPerKm: '240', lthr: 165 })).toEqual({
      runThresholdPaceSecPerKm: null,
      ftpW: null,
      lthr: 165,
      maxHr: null,
    });
  });

  it('returns null for a non-object', () => {
    expect(parsePushedThresholds('nope')).toBeNull();
  });
});
