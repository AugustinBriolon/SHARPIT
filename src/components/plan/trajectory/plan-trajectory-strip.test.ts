import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PlanTrajectoryStrip', () => {
  const strip = readFileSync(
    resolve(process.cwd(), 'src/components/plan/trajectory/plan-trajectory-strip.tsx'),
    'utf8',
  );

  it('surfaces adaptation and charge as Plan trajectory chips', () => {
    expect(strip).toContain('Adaptation');
    expect(strip).toContain('Charge');
    expect(strip).toContain('SignalSpectrum');
    expect(strip).toContain('lecture Twin');
    expect(strip).toContain('Pas un ajustement');
  });
});
