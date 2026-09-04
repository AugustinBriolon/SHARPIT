import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { activityMayHaveRoutePath, hasUsableRoutePath } from './completed-session-preview-helpers';

describe('completed-session-preview-helpers', () => {
  it('treats strength as never having a route path', () => {
    expect(activityMayHaveRoutePath(ActivityType.STRENGTH)).toBe(false);
    expect(activityMayHaveRoutePath(ActivityType.RUN)).toBe(true);
  });

  it('requires at least two path points', () => {
    expect(hasUsableRoutePath(null)).toBe(false);
    expect(hasUsableRoutePath([[48.8, 2.3]])).toBe(false);
    expect(
      hasUsableRoutePath([
        [48.8, 2.3],
        [48.81, 2.31],
      ]),
    ).toBe(true);
  });
});
