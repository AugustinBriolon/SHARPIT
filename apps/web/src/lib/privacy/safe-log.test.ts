import { describe, expect, it } from 'vitest';
import { sanitizeLogValue } from '@/lib/privacy/safe-log';

describe('sanitizeLogValue', () => {
  it('redacts password and token keys', () => {
    const cleaned = sanitizeLogValue({
      email: 'a@b.com',
      password: 'hunter2',
      accessToken: 'abc',
      nested: { refresh_token: 'xyz', ok: true },
    }) as Record<string, unknown>;

    expect(cleaned.email).toBe('a@b.com');
    expect(cleaned.password).toBe('[Redacted]');
    expect(cleaned.accessToken).toBe('[Redacted]');
    expect((cleaned.nested as Record<string, unknown>).refresh_token).toBe('[Redacted]');
    expect((cleaned.nested as Record<string, unknown>).ok).toBe(true);
  });

  it('keeps Error name/message only', () => {
    const cleaned = sanitizeLogValue(new Error('boom')) as { name: string; message: string };
    expect(cleaned.name).toBe('Error');
    expect(cleaned.message).toBe('boom');
  });
});
