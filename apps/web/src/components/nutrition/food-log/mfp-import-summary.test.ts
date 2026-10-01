import { describe, expect, it } from 'vitest';
import { mfpImportFileProblem, mfpImportSummary } from './mfp-import-summary';

describe('mfpImportSummary', () => {
  it('says how many days came in and over which span', () => {
    expect(
      mfpImportSummary({
        importedDays: 412,
        firstDay: '2024-01-03',
        lastDay: '2026-09-30',
        skippedRows: 0,
      }),
    ).toEqual(['412 jours importés, du 3 janv. 2024 au 30 sept. 2026.']);
  });

  it('counts the rows left out', () => {
    expect(
      mfpImportSummary({
        importedDays: 1,
        firstDay: '2026-10-01',
        lastDay: '2026-10-01',
        skippedRows: 2,
      }),
    ).toEqual([
      '1 jour importé, du 1 oct. 2026 au 1 oct. 2026.',
      '2 lignes sans date ou sans calories ignorées.',
    ]);
  });
});

describe('mfpImportFileProblem', () => {
  it('refuses a file over 4 MB before sending it', () => {
    expect(mfpImportFileProblem({ size: 5 * 1024 * 1024 })).toBe(
      'Fichier trop lourd (4 Mo maximum).',
    );
    expect(mfpImportFileProblem({ size: 300_000 })).toBeNull();
  });
});
