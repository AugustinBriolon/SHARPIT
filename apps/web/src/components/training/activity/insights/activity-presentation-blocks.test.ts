import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActivityDetail } from '../detail/types';
import { RhythmSplits } from '../reading/rhythm-splits';
import { ActivitySpecsNotes } from '../detail/activity-specs-notes';

describe('RhythmSplits', () => {
  it('renders relative pace bars instead of a dense spreadsheet', () => {
    const html = renderToStaticMarkup(
      createElement(RhythmSplits, {
        title: 'Splits au kilomètre',
        splits: [
          {
            index: 1,
            label: '1',
            distanceM: 1000,
            durationSec: 285,
            paceSecPerKm: 285,
            avgHr: 152,
            avgWatts: null,
            elevationGainM: 12,
          },
        ],
      }),
    );

    expect(html).toContain('Rythme relatif');
    expect(html).toContain('activity-log-rhythm');
    expect(html).toContain('Splits au kilomètre');
  });
});

describe('ActivitySpecsNotes', () => {
  it('shows characteristics flat (no disclosure) and notes on a log surface', () => {
    const activity = { notes: 'Vent de face au retour' } as unknown as ActivityDetail;

    const html = renderToStaticMarkup(
      createElement(ActivitySpecsNotes, {
        activity,
        specs: [
          { label: 'Source', value: 'Garmin' },
          { label: 'Lieu', value: 'Paris' },
        ],
      }),
    );

    expect(html).toContain('Caractéristiques');
    expect(html).toContain('activity-log-annex');
    expect(html).toContain('activity-log-notes');
    expect(html).toContain('Vent de face au retour');
    expect(html).toContain('Garmin');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('data-slot="card"');
  });
});
