import { describe, expect, it } from 'vitest';
import {
  TEASER_BRAND,
  TEASER_CONTINUE_LABEL,
  TEASER_FORBIDDEN_COPY,
  TEASER_PRIMARY_CTA,
  TEASER_SCREENS,
  TEASER_SECONDARY_CTA,
} from '@/lib/teaser/screens';

function allCopy(): string {
  return [
    TEASER_BRAND,
    TEASER_CONTINUE_LABEL,
    TEASER_PRIMARY_CTA.label,
    TEASER_SECONDARY_CTA.label,
    ...TEASER_SCREENS.flatMap((s) => [s.eyebrow, s.title, s.body]),
  ].join('\n');
}

describe('teaser screens copy', () => {
  it('ships exactly three promise screens', () => {
    expect(TEASER_SCREENS).toHaveLength(3);
    expect(TEASER_SCREENS.map((s) => s.id)).toEqual(['endurance', 'twin', 'morning']);
  });

  it('wires primary CTA to Clerk sign-up and secondary to sign-in', () => {
    expect(TEASER_PRIMARY_CTA.href).toBe('/sign-up');
    expect(TEASER_SECONDARY_CTA.href).toBe('/sign-in');
  });

  it('uses French athlete copy without em dashes or AI dash separators', () => {
    const copy = allCopy();
    expect(copy).not.toMatch(/—/);
    expect(copy).not.toMatch(/–/);
  });

  it('never uses SharpIt camelCase on the public teaser', () => {
    expect(allCopy()).not.toMatch(/SharpIt/);
  });

  it('never implies Art. 9 health processing or a private-circle wall', () => {
    const lower = allCopy().toLowerCase();
    for (const forbidden of TEASER_FORBIDDEN_COPY) {
      expect(lower).not.toContain(forbidden.toLowerCase());
    }
  });

  it('keeps brand as SHARPIT on the public surface', () => {
    expect(TEASER_BRAND).toBe('SHARPIT');
  });
});
