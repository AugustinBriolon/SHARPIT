import { describe, expect, it } from 'vitest';
import {
  describeBikeWorkBlocks,
  parsePrescriptionTargets,
  shouldAnalyzeBikeWorkBlocks,
  summarizeBikeWorkBlocks,
} from '@/lib/coach/plan/bike-work-blocks';

describe('parsePrescriptionTargets', () => {
  it('parses 3x15min @ 85% FTP', () => {
    expect(
      parsePrescriptionTargets(
        'Échauffement 20min + 3x15min à 85% FTP (Allure course) / r=5min + Retour au calme.',
      ),
    ).toEqual({
      ftpPct: 85,
      reps: 3,
      repDurationMin: 15,
      plannedWorkMin: 45,
    });
  });

  it('returns nulls when nothing matches', () => {
    expect(parsePrescriptionTargets('Sortie endurance facile')).toEqual({
      ftpPct: null,
      reps: null,
      repDurationMin: null,
      plannedWorkMin: null,
    });
  });
});

describe('shouldAnalyzeBikeWorkBlocks', () => {
  it('is true for TEMPO even without description targets', () => {
    expect(shouldAnalyzeBikeWorkBlocks({ intensity: 'TEMPO', description: null })).toBe(true);
  });

  it('is true for ENDURANCE when %FTP is present', () => {
    expect(
      shouldAnalyzeBikeWorkBlocks({ intensity: 'ENDURANCE', description: '90 min @ 70% FTP' }),
    ).toBe(true);
  });

  it('is false for plain recovery', () => {
    expect(shouldAnalyzeBikeWorkBlocks({ intensity: 'RECOVERY', description: 'spin easy' })).toBe(
      false,
    );
  });
});

describe('summarizeBikeWorkBlocks', () => {
  it('detects sustained tempo blocks and ignores warm-up dilution', () => {
    const ftpW = 200;
    const watts = [
      ...Array.from({ length: 10 * 60 }, () => 70), // warm-up
      ...Array.from({ length: 15 * 60 }, () => 170), // work 1
      ...Array.from({ length: 5 * 60 }, () => 80), // recovery
      ...Array.from({ length: 15 * 60 }, () => 172), // work 2
      ...Array.from({ length: 5 * 60 }, () => 80),
      ...Array.from({ length: 15 * 60 }, () => 168), // work 3
      ...Array.from({ length: 5 * 60 }, () => 60), // cool-down
    ];

    const summary = summarizeBikeWorkBlocks({
      watts,
      ftpW,
      intensity: 'TEMPO',
      description: 'Échauffement + 3x15min à 85% FTP / r=5min',
    });

    expect(summary).not.toBeNull();
    expect(summary!.targetWatts).toBe(170);
    expect(summary!.workFloorPctFtp).toBe(77); // 85 - 8
    expect(summary!.blocks).toHaveLength(3);
    expect(summary!.blocks.every((b) => b.durationSec >= 14 * 60)).toBe(true);
    expect(summary!.blocks.every((b) => b.avgWatts >= 165)).toBe(true);
    expect(summary!.totalWorkSec).toBeGreaterThanOrEqual(44 * 60);
    expect(summary!.plannedWorkMin).toBe(45);
    // Whole-session average would be diluted — work average stays near target.
    const sessionAvg = Math.round(watts.reduce((a, b) => a + b, 0) / watts.length);
    expect(sessionAvg).toBeLessThan(140);
    expect(summary!.workAvgWatts).toBeGreaterThan(160);
  });

  it('merges brief dips inside a work block', () => {
    const ftpW = 200;
    const watts = [
      ...Array.from({ length: 8 * 60 }, () => 170),
      ...Array.from({ length: 40 }, () => 90), // short dip
      ...Array.from({ length: 8 * 60 }, () => 170),
    ];
    const summary = summarizeBikeWorkBlocks({
      watts,
      ftpW,
      intensity: 'TEMPO',
      description: '2x8min à 85% FTP',
    });
    expect(summary!.blocks).toHaveLength(1);
    expect(summary!.blocks[0].durationSec).toBeGreaterThan(15 * 60);
  });

  it('returns null without FTP or short stream', () => {
    expect(
      summarizeBikeWorkBlocks({
        watts: Array.from({ length: 20 }, () => 170),
        ftpW: 200,
        intensity: 'TEMPO',
      }),
    ).toBeNull();
    expect(
      summarizeBikeWorkBlocks({
        watts: Array.from({ length: 120 }, () => 170),
        ftpW: 0,
        intensity: 'TEMPO',
      }),
    ).toBeNull();
  });
});

describe('describeBikeWorkBlocks', () => {
  it('mentions target and heuristic caveat', () => {
    const text = describeBikeWorkBlocks({
      ftpW: 207,
      targetWatts: 176,
      targetPctFtp: 85,
      workFloorWatts: 159,
      workFloorPctFtp: 77,
      totalWorkSec: 45 * 60,
      workAvgWatts: 170,
      workAvgPctFtp: 82,
      plannedWorkMin: 45,
      prescription: { ftpPct: 85, reps: 3, repDurationMin: 15, plannedWorkMin: 45 },
      blocks: [
        {
          startSec: 20 * 60,
          endSec: 35 * 60 - 1,
          durationSec: 15 * 60,
          avgWatts: 170,
          pctFtp: 82,
        },
      ],
    });
    expect(text).toContain('176 W');
    expect(text).toContain('heuristique');
    expect(text).toContain('Bloc 1');
  });
});
