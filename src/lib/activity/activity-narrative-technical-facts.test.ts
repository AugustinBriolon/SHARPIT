import { describe, expect, it } from 'vitest';
import type { ActivityAnalysis } from '@/lib/activity/activity-analysis';
import {
  buildTechnicalSessionFacts,
  DECOUPLING_NOTEWORTHY_PCT,
} from '@/lib/activity/activity-narrative-technical-facts';

function baseAnalysis(overrides?: Partial<ActivityAnalysis>): ActivityAnalysis {
  return {
    thresholds: {
      ftp: 250,
      maxHr: 190,
      lthr: 170,
      runThresholdPaceSecPerKm: 300,
      source: 'profile',
    },
    load: { tss: 55, intensityFactor: 0.75, method: 'hr' },
    hr: {
      zones: [
        {
          id: 'z1',
          label: 'Récupération',
          shortLabel: 'Z1',
          color: '#1',
          seconds: 600,
          percent: 10,
        },
        {
          id: 'z2',
          label: 'Endurance',
          shortLabel: 'Z2',
          color: '#2',
          seconds: 3600,
          percent: 60,
        },
        {
          id: 'z3',
          label: 'Tempo',
          shortLabel: 'Z3',
          color: '#3',
          seconds: 1200,
          percent: 20,
        },
        {
          id: 'z4',
          label: 'Seuil',
          shortLabel: 'Z4',
          color: '#4',
          seconds: 480,
          percent: 8,
        },
        {
          id: 'z5',
          label: 'VO2max+',
          shortLabel: 'Z5',
          color: '#5',
          seconds: 120,
          percent: 2,
        },
      ],
      decouplingPct: 3,
      efficiencyFactor: 1.1,
      efficiencyLabel: 'Efficacité',
      avgHr: 145,
      maxHr: 172,
    },
    power: null,
    run: { splits: [], paceVariabilityPct: 4, avgPaceSecPerKm: 320 },
    bike: null,
    ...overrides,
  };
}

describe('buildTechnicalSessionFacts', () => {
  it('returns empty when analysis is missing', () => {
    expect(buildTechnicalSessionFacts({ sport: 'RUN', analysis: null })).toEqual([]);
  });

  it('emits zone summary and dominant-zone signal for easy endurance', () => {
    const lines = buildTechnicalSessionFacts({
      sport: 'RUN',
      analysis: baseAnalysis(),
    });
    expect(lines.some((l) => l.includes('Zones FC') && l.includes('LTHR 170'))).toBe(true);
    expect(lines.some((l) => l.includes('majorité du temps en Z2'))).toBe(true);
    expect(lines.some((l) => l.includes('Z4+'))).toBe(false);
  });

  it('flags hard-zone share instead of dominant easy zone', () => {
    const analysis = baseAnalysis({
      hr: {
        ...baseAnalysis().hr,
        zones: [
          {
            id: 'z2',
            label: 'Endurance',
            shortLabel: 'Z2',
            color: '#2',
            seconds: 1000,
            percent: 40,
          },
          {
            id: 'z4',
            label: 'Seuil',
            shortLabel: 'Z4',
            color: '#4',
            seconds: 800,
            percent: 35,
          },
          {
            id: 'z5',
            label: 'VO2max+',
            shortLabel: 'Z5',
            color: '#5',
            seconds: 400,
            percent: 25,
          },
        ],
      },
    });
    const lines = buildTechnicalSessionFacts({ sport: 'RUN', analysis });
    expect(lines.some((l) => l.includes('Z4+') && l.includes('60%'))).toBe(true);
    expect(lines.some((l) => l.includes('majorité du temps'))).toBe(false);
  });

  it('emits decoupling only above the noteworthiness bar', () => {
    const quiet = buildTechnicalSessionFacts({
      sport: 'RUN',
      analysis: baseAnalysis({ hr: { ...baseAnalysis().hr, decouplingPct: 3 } }),
    });
    expect(quiet.some((l) => l.includes('Découplage'))).toBe(false);

    const loud = buildTechnicalSessionFacts({
      sport: 'RUN',
      analysis: baseAnalysis({
        hr: { ...baseAnalysis().hr, decouplingPct: DECOUPLING_NOTEWORTHY_PCT + 1 },
      }),
    });
    expect(loud.some((l) => l.includes('Découplage') && l.includes('+6.0%'))).toBe(true);
  });

  it('never injects cadence coaching into technical facts', () => {
    const lines = buildTechnicalSessionFacts({
      sport: 'RUN',
      analysis: baseAnalysis(),
    });
    expect(lines.join(' ').toLowerCase()).not.toMatch(/cadence|idéal|180|spm|pose/);
  });

  it('emits VI when power effort is ragged', () => {
    const lines = buildTechnicalSessionFacts({
      sport: 'BIKE',
      analysis: baseAnalysis({
        power: {
          normalized: 220,
          avg: 190,
          variabilityIndex: 1.16,
          intensityFactor: 0.88,
          tss: 70,
          zones: [],
        },
      }),
    });
    expect(lines.some((l) => l.includes('VI') && l.includes('1.16'))).toBe(true);
  });
});
