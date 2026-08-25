import { describe, expect, it } from 'vitest';
import { coachBeuiCopy } from '@/components/coach/beui/coach-beui-copy';

describe('coachBeuiCopy approval strings', () => {
  it('describes delete consequence with date when provided', () => {
    expect(coachBeuiCopy.deleteConsequence('2026-08-26')).toContain('2026-08-26');
    expect(coachBeuiCopy.deleteConsequence()).toContain('irréversible');
  });
});
