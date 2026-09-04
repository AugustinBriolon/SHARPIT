import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PlanTrajectoryStrip', () => {
  const strip = readFileSync(
    resolve(process.cwd(), 'src/components/plan/plan-trajectory-strip.tsx'),
    'utf8',
  );
  const hub = readFileSync(
    resolve(process.cwd(), 'src/components/shell/plan-hub-widgets.tsx'),
    'utf8',
  );

  it('surfaces adaptation and charge as Plan trajectory chips', () => {
    expect(strip).toContain('Adaptation');
    expect(strip).toContain('Charge');
    expect(strip).toContain('SignalSpectrum');
    expect(hub).toContain('PlanTrajectoryStrip');
    expect(hub).toContain('buildPlanTrajectoryPreviews');
  });
});
