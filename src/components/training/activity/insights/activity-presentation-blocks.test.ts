import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActivityDetail } from '../detail/types';
import { SplitsTable } from './splits-table';
import { ActivitySpecsNotes } from '../detail/activity-specs-notes';

describe('SplitsTable', () => {
  it('renders as a technical split table with its own headed surface', () => {
    const html = renderToStaticMarkup(
      createElement(SplitsTable, {
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

    expect(html).toContain('Lecture séquentielle split par split');
    expect(html).toContain('analysis-panel');
    expect(html).toContain('Splits au kilomètre');
  });
});

describe('ActivitySpecsNotes', () => {
  it('keeps characteristics light and notes on a separate surface', () => {
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
    expect(html).toContain('analysis-panel-alt');
    expect(html).toContain('Vent de face au retour');
    expect(html).not.toContain('data-slot="card"');
  });
});
