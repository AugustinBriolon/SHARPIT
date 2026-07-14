import { describe, expect, it } from 'vitest';
import { coachMemorySourceLabel, isCoachMemorySource } from '@/lib/coach-memory/types';

describe('coachMemorySourceLabel', () => {
  it('covers Prisma enum values USER and COACH', () => {
    expect(isCoachMemorySource('USER')).toBe(true);
    expect(isCoachMemorySource('COACH')).toBe(true);
    expect(coachMemorySourceLabel('USER')).toBe('Ajout manuel');
    expect(coachMemorySourceLabel('COACH')).toBe('Déduit du coach');
  });

  it('returns null for missing source (root cause of empty badge)', () => {
    expect(coachMemorySourceLabel(undefined)).toBeNull();
    expect(coachMemorySourceLabel(null)).toBeNull();
    expect(coachMemorySourceLabel('')).toBeNull();
  });

  it('returns null for unknown legacy values', () => {
    expect(coachMemorySourceLabel('manual')).toBeNull();
    expect(coachMemorySourceLabel('inferred')).toBeNull();
  });
});
