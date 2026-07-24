import { describe, expect, it } from 'vitest';
import { buildMorningProposalCompareRows } from '@/lib/today/morning-proposal-compare';

describe('buildMorningProposalCompareRows', () => {
  it('marks changed scalar fields and formats duration / load', () => {
    const rows = buildMorningProposalCompareRows(
      { intensityLabel: 'Tempo', durationMin: 45, load: 55 },
      { intensityLabel: 'Endurance', durationMin: 45, load: 41 },
    );

    expect(rows).toEqual([
      {
        label: 'Intensité',
        current: 'Tempo',
        proposed: 'Endurance',
        changed: true,
      },
      {
        label: 'Durée',
        current: '45 min',
        proposed: '45 min',
        changed: false,
      },
      {
        label: 'Charge',
        current: '55 TSS',
        proposed: '41 TSS',
        changed: true,
      },
    ]);
  });

  it('handles missing sides with em dash', () => {
    const rows = buildMorningProposalCompareRows(
      { intensityLabel: null, durationMin: null, load: null },
      { intensityLabel: 'Récup', durationMin: 30, load: 20 },
    );

    expect(rows[0]).toMatchObject({ current: '—', proposed: 'Récup', changed: true });
    expect(rows[1]).toMatchObject({ current: '—', proposed: '30 min', changed: true });
    expect(rows[2]).toMatchObject({ current: '—', proposed: '20 TSS', changed: true });
  });
});
