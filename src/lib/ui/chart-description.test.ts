import { describe, expect, it } from 'vitest';

import { describeChart, describeChartSeries } from '@/lib/ui/chart-description';

describe('describeChartSeries', () => {
  it('reports direction, endpoints and extremes', () => {
    const summary = describeChartSeries({
      name: 'Forme chronique',
      unit: 'TSS',
      points: [
        { label: '1 août', value: 30 },
        { label: '8 août', value: 45 },
        { label: '15 août', value: 37 },
      ],
    });

    expect(summary).toContain('Forme chronique');
    expect(summary).toContain('en hausse');
    expect(summary).toContain('30 TSS (1 août)');
    expect(summary).toContain('37 TSS (15 août)');
    expect(summary).toContain('Minimum 30 TSS');
    expect(summary).toContain('maximum 45 TSS');
  });

  it('calls a declining series en baisse', () => {
    const summary = describeChartSeries({
      name: 'Fatigue aiguë',
      points: [
        { label: 'lun', value: 60 },
        { label: 'mar', value: 40 },
      ],
    });
    expect(summary).toContain('en baisse');
  });

  it('calls equal endpoints stable', () => {
    const summary = describeChartSeries({
      name: 'HRV',
      points: [
        { label: 'lun', value: 50 },
        { label: 'mar', value: 70 },
        { label: 'mer', value: 50 },
      ],
    });
    expect(summary).toContain('stable');
    // The endpoints match but the middle must still widen the reported range.
    expect(summary).toContain('maximum 70');
  });

  it('skips gaps when picking the first and last readings', () => {
    const summary = describeChartSeries({
      name: 'Sommeil',
      unit: 'h',
      points: [
        { label: 'lun', value: null },
        { label: 'mar', value: 7 },
        { label: 'mer', value: 8 },
        { label: 'jeu', value: null },
      ],
    });
    expect(summary).toContain('7 h (mar)');
    expect(summary).toContain('8 h (mer)');
  });

  it('states plainly when a series has no readings', () => {
    expect(
      describeChartSeries({ name: 'Puissance', points: [{ label: 'lun', value: null }] }),
    ).toBe('Puissance : aucune donnée.');
  });

  it('does not claim a trend from a single reading', () => {
    const summary = describeChartSeries({
      name: 'Poids',
      unit: 'kg',
      points: [{ label: 'lun', value: 68 }],
    });
    expect(summary).toBe('Poids : 68 kg le lun.');
    expect(summary).not.toContain('hausse');
  });

  it('rounds to one decimal rather than emitting float noise', () => {
    const summary = describeChartSeries({
      name: 'Ratio',
      points: [
        { label: 'a', value: 0.3333333 },
        { label: 'b', value: 1.6666666 },
      ],
    });
    expect(summary).toContain('0.3');
    expect(summary).toContain('1.7');
  });
});

describe('describeChart', () => {
  it('leads with the chart title, then one sentence per series', () => {
    const description = describeChart('Charge vs forme — 28 jours', [
      { name: 'Forme chronique', points: [{ label: 'a', value: 30 }] },
      { name: 'Fatigue aiguë', points: [{ label: 'a', value: 20 }] },
    ]);

    expect(description.startsWith('Charge vs forme — 28 jours.')).toBe(true);
    expect(description).toContain('Forme chronique');
    expect(description).toContain('Fatigue aiguë');
  });
});
