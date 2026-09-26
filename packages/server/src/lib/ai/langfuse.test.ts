import { describe, expect, it } from 'vitest';
import { isLangfuseConfigured } from './langfuse';

describe('isLangfuseConfigured', () => {
  it('is always false under Vitest so unit tests never open exporters', () => {
    expect(isLangfuseConfigured()).toBe(false);
  });
});
