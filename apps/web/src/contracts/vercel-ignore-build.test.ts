import { describe, expect, it } from 'vitest';
import {
  affectedApps,
  isIgnorablePath,
  parseScope,
  resolveDiffRange,
  shouldIgnoreBuild,
} from '../../../../scripts/ci/vercel-ignore-build.mjs';

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
  });

  it('builds an app only for changes in its scope', () => {
    const api = parseScope(['node', 'x', '--app', 'api']);
    expect(shouldIgnoreBuild(['apps/web/src/app/page.tsx'], api)).toBe(true);
    expect(shouldIgnoreBuild(['apps/web/src/app/page.tsx', 'apps/api/vercel.json'], api)).toBe(
      false,
    );
    expect(shouldIgnoreBuild(['packages/server/src/lib/x.ts'], api)).toBe(false);
    expect(shouldIgnoreBuild(['yarn.lock'], api)).toBe(false);
    expect(shouldIgnoreBuild(['apps/api-legacy/x.ts'], api)).toBe(true);
    expect(parseScope(['node', 'x'])).toBeNull();
    expect(() => parseScope(['node', 'x', '--app', 'nope'])).toThrow(/Unknown app/);
  });

  it('deploys exactly the apps a change touches', () => {
    expect(affectedApps(['docs/adr/ADR-001.md'])).toEqual([]);
    expect(affectedApps(['apps/hub/src/app/layout.tsx'])).toEqual(['hub']);
    expect(affectedApps(['packages/server/src/lib/x.ts'])).toEqual(['api']);
    expect(affectedApps(['packages/ui/src/components/ui/button.tsx'])).toEqual(['web', 'hub']);
    expect(affectedApps(['packages/app/src/lib/format.ts'])).toEqual(['web', 'api', 'hub']);
    expect(affectedApps(['packages/db/prisma/schema.prisma'])).toEqual(['web', 'api']);
    expect(affectedApps(['packages/db/src/client.ts'])).toEqual(['api']);
    expect(affectedApps(['yarn.lock'])).toEqual(['web', 'api', 'hub']);
  });

  it('builds a redeploy of the same commit (empty diff), e.g. after an env change', () => {
    expect(shouldIgnoreBuild([])).toBe(false);
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
