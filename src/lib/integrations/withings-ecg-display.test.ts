import { describe, expect, it } from 'vitest';
import {
  formatAfibResult,
  parseWithingsEcgStats,
  resolveWithingsEcgClassification,
} from './withings-ecg-display';

describe('withings-ecg-display', () => {
  it('mappe le code 9 Body Scan en mauvais enregistrement', () => {
    const info = resolveWithingsEcgClassification(9);
    expect(info.label).toBe('Mauvais enregistrement');
    expect(info.tone).toBe('neutral');
    expect(info.action).toMatch(/Refais/i);
  });

  it('mappe le schéma legacy 0 en rythme sinusal', () => {
    expect(formatAfibResult(0)).toBe('Rythme sinusal');
  });

  it('mappe le schéma étendu 4 en rythme sinusal', () => {
    expect(formatAfibResult(4)).toBe('Rythme sinusal');
  });

  it('préfère ecgAfibClassification Heart v2 pour l affichage', () => {
    const stats = parseWithingsEcgStats({
      ecg: { '130': 9 },
      ecgAfibClassification: 0,
    });
    expect(stats).toHaveLength(1);
    expect(stats[0]?.displayValue).toBe('Rythme sinusal');
    expect(stats[0]?.value).toBe(0);
  });
});
