import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv } from './csv';

describe('parseCsv', () => {
  it('reads quoted fields, doubled quotes, CRLF and a BOM, skipping blank lines', () => {
    const text = '\uFEFFDate,Meal,Note\r\n2026-10-01,"Lunch, late","said ""ok"""\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ['Date', 'Meal', 'Note'],
      ['2026-10-01', 'Lunch, late', 'said "ok"'],
    ]);
  });

  it('reads a semicolon file saved by a French spreadsheet', () => {
    expect(parseCsv('Date;Repas;Calories\n01/10/2026;Dîner;650,5')).toEqual([
      ['Date', 'Repas', 'Calories'],
      ['01/10/2026', 'Dîner', '650,5'],
    ]);
  });
});

describe('detectDelimiter', () => {
  it('picks the separator the header uses most', () => {
    expect(detectDelimiter('a,b,c')).toBe(',');
    expect(detectDelimiter('a;b;c')).toBe(';');
  });
});
