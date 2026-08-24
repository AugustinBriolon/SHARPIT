import { describe, expect, it } from 'vitest';
import { hasDemoCookieValue } from './use-is-demo-mode';

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
