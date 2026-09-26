import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Hotfix guard: the long medical disclaimer must not reappear on coaching UI.
 * Keep the shared module; render MedicalDisclaimerNote only in Settings → À propos.
 */
describe('medical disclaimer placement', () => {
  const coachingSurfaces = [
    'src/components/today/today-dashboard-main.tsx',
    'src/components/today/dashboard/morning-wellness-dialog.tsx',
    'src/components/recovery/blocks/recovery-alerts-section.tsx',
  ];

  it('does not render MedicalDisclaimerNote on Today / wellness / recovery alerts', () => {
    for (const rel of coachingSurfaces) {
      const source = readFileSync(resolve(process.cwd(), rel), 'utf8');
      expect(source).not.toContain('MedicalDisclaimerNote');
      expect(source).not.toContain('medical-disclaimer-note');
    }
  });

  it('keeps MedicalDisclaimerNote on Settings À propos Confidentialité block', () => {
    const about = readFileSync(
      resolve(process.cwd(), 'src/app/(app)/settings/about/page.tsx'),
      'utf8',
    );
    expect(about).toContain('MedicalDisclaimerNote');
    expect(about).toContain('settings-about-confidentialite');
    expect(about).toMatch(/Confidentialité/);
  });
});
