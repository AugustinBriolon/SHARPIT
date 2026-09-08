import { describe, expect, it } from 'vitest';
import { partitionWeightedInstruments } from './weighted-instruments-helpers';

describe('partitionWeightedInstruments', () => {
  it('keeps the first three as primary and the rest secondary', () => {
    const items = [
      { label: 'Distance', value: '11 km' },
      { label: 'Temps', value: '1h13' },
      { label: 'Allure', value: "6'27" },
      { label: 'FC moy.', value: '134' },
      { label: 'Cadence', value: '158' },
    ];
    expect(partitionWeightedInstruments(items)).toEqual({
      primary: items.slice(0, 3),
      secondary: items.slice(3),
    });
  });

  it('returns all primary when fewer than the cap', () => {
    const items = [
      { label: 'Distance', value: '5 km' },
      { label: 'Temps', value: '30 min' },
    ];
    expect(partitionWeightedInstruments(items)).toEqual({
      primary: items,
      secondary: [],
    });
  });

  it('respects a custom primary count', () => {
    const items = [
      { label: 'A', value: '1' },
      { label: 'B', value: '2' },
      { label: 'C', value: '3' },
    ];
    expect(partitionWeightedInstruments(items, 1)).toEqual({
      primary: [items[0]],
      secondary: items.slice(1),
    });
  });
});
