import { describe, expect, it } from 'vitest';
import { hasDemoCookieValue, resolveIsDemoMode } from './use-is-demo-mode';

describe('hasDemoCookieValue', () => {
  it('is false for an empty cookie string', () => {
    expect(hasDemoCookieValue('')).toBe(false);
  });

  it('is true when the demo cookie is set to 1', () => {
    expect(hasDemoCookieValue('sharpit_demo=1')).toBe(true);
  });

  it('is false for any other cookie value', () => {
    expect(hasDemoCookieValue('sharpit_demo=maybe')).toBe(false);
  });

  it('reads correctly alongside unrelated cookies', () => {
    expect(hasDemoCookieValue('other=1; sharpit_demo=1; another=x')).toBe(true);
  });

  it('does not match a cookie that merely contains the name as a substring', () => {
    expect(hasDemoCookieValue('not_sharpit_demo=1')).toBe(false);
  });
});

describe('resolveIsDemoMode', () => {
  it('is false until auth has loaded', () => {
    expect(resolveIsDemoMode(true, null, false)).toBe(false);
  });

  it('is false when a real Clerk session is present, even with the demo cookie', () => {
    expect(resolveIsDemoMode(true, 'user_abc', true)).toBe(false);
  });

  it('is true for an anonymous visitor with the demo cookie', () => {
    expect(resolveIsDemoMode(true, null, true)).toBe(true);
  });

  it('is false without the demo cookie', () => {
    expect(resolveIsDemoMode(false, null, true)).toBe(false);
  });
});
