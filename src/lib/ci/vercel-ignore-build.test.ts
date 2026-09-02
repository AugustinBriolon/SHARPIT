import { describe, expect, it } from 'vitest';
import {
  isIgnorablePath,
  resolveDiffRange,
  shouldIgnoreBuild,
} from '../../../scripts/ci/vercel-ignore-build.mjs';

describe('vercel ignore build helpers', () => {
  it('ignores docs and design screenshot paths', () => {
    expect(isIgnorablePath('docs/product/PRODUCT.md')).toBe(true);
    expect(isIgnorablePath('docs/design/today-v0/today_mobile_fold.png')).toBe(true);
    expect(isIgnorablePath('README.md')).toBe(true);
  });

  it('does not ignore app, config, lockfile, or env templates', () => {
    expect(isIgnorablePath('src/app/page.tsx')).toBe(false);
    expect(isIgnorablePath('package.json')).toBe(false);
    expect(isIgnorablePath('yarn.lock')).toBe(false);
    expect(isIgnorablePath('.env.example')).toBe(false);
    expect(isIgnorablePath('vercel.json')).toBe(false);
    expect(isIgnorablePath('next.config.ts')).toBe(false);
    expect(isIgnorablePath('prisma/schema.prisma')).toBe(false);
  });

  it('skips build only when every changed file is ignorable', () => {
    expect(
      shouldIgnoreBuild([
        'docs/design/toast-update/update_toast_available_mobile.png',
        'docs/product/PRODUCT.md',
      ]),
    ).toBe(true);
    expect(shouldIgnoreBuild(['docs/adr/ADR-001.md', 'src/lib/foo.ts'])).toBe(false);
    expect(shouldIgnoreBuild(['yarn.lock'])).toBe(false);
    expect(shouldIgnoreBuild([])).toBe(true);
  });

  it('prefers VERCEL_GIT_PREVIOUS_SHA and fails open without a parent', () => {
    expect(resolveDiffRange({ previousSha: 'abc123', hasParent: true })).toEqual({
      start: 'abc123',
      end: 'HEAD',
    });
    expect(resolveDiffRange({ previousSha: '', hasParent: false })).toBeNull();
    expect(resolveDiffRange({ previousSha: '', hasParent: true })).toEqual({
      start: 'HEAD^',
      end: 'HEAD',
    });
    expect(
      resolveDiffRange({
        previousSha: '0000000000000000000000000000000000000000',
        hasParent: true,
      }),
    ).toEqual({ start: 'HEAD^', end: 'HEAD' });
  });
});
