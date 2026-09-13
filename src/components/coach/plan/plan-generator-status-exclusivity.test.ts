import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('plan generator loading status exclusivity', () => {
  it('renders CoachGenerationProgressPanel only once (parent, not results)', () => {
    const root = join(process.cwd(), 'src/components/coach/plan');
    const generator = readFileSync(join(root, 'plan-generator.tsx'), 'utf8');
    const results = readFileSync(join(root, 'plan-generator-results.tsx'), 'utf8');

    expect(generator).toContain('CoachGenerationProgressPanel');
    expect(results).not.toContain('CoachGenerationProgressPanel');
    expect(results).not.toContain('Le coach analyse');
  });
});
