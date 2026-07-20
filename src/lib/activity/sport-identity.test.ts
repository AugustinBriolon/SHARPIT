import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';

import { SPORT_IDENTITY_SURFACE, SPORT_IDENTITY_TEXT, sportIdentityHex } from './sport-identity';

const SPORTS = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
] as const;

describe('sport identity', () => {
  it('gives every competitive sport a distinct surface token', () => {
    const surfaces = SPORTS.map((type) => SPORT_IDENTITY_SURFACE[type]);
    expect(new Set(surfaces).size).toBe(SPORTS.length);
  });

  it('does not put strength or triathlon on Lime Pulse highlight', () => {
    expect(SPORT_IDENTITY_SURFACE[ActivityType.STRENGTH]).not.toContain('highlight');
    expect(SPORT_IDENTITY_SURFACE[ActivityType.TRIATHLON]).not.toContain('highlight');
    expect(SPORT_IDENTITY_SURFACE[ActivityType.STRENGTH]).toContain('rose');
    expect(SPORT_IDENTITY_SURFACE[ActivityType.TRIATHLON]).toContain('teal');
  });

  it('exposes text accents for detail pages', () => {
    expect(SPORT_IDENTITY_TEXT[ActivityType.RUN]).toContain('orange');
    expect(SPORT_IDENTITY_TEXT[ActivityType.STRENGTH]).toContain('rose');
  });

  it('sportIdentityHex returns orange for RUN (map paint)', () => {
    expect(sportIdentityHex(ActivityType.RUN)).toBe('#ea580c');
    expect(sportIdentityHex(ActivityType.BIKE)).toBe('#059669');
  });
});
