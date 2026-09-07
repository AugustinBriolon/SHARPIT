import { afterEach, describe, expect, it } from 'vitest';
import { readPlanHubNow, rememberPlanHubNow, resetPlanHubNowForTests } from './plan-hub-clock';

describe('plan-hub-clock', () => {
  afterEach(() => {
    resetPlanHubNowForTests();
  });

  it('starts empty then remembers the session clock for the next Plan visit', () => {
    expect(readPlanHubNow()).toBeNull();
    const now = new Date('2026-09-06T10:00:00.000Z');
    expect(rememberPlanHubNow(now)).toBe(now);
    expect(readPlanHubNow()).toBe(now);
  });
});
