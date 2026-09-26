import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function vercelConfig(app: 'api' | 'web'): {
  buildCommand?: string;
  functions?: object;
  ignoreCommand?: string;
} {
  const path = app === 'api' ? 'vercel.json' : '../web/vercel.json';
  return JSON.parse(readFileSync(path, 'utf8')) as { buildCommand?: string };
}

/** ADR-048 phase 3: one migration owner — the project holding the database, not the web. */
describe('migration owner', () => {
  it('sharpit-api migrates before it builds', () => {
    expect(vercelConfig('api').buildCommand).toBe('yarn db:migrate:deploy && yarn build');
  });

  it('the web project never migrates, and has no function of its own to size', () => {
    expect(vercelConfig('web').buildCommand).not.toContain('migrate');
    expect(vercelConfig('web').functions).toBeUndefined();
  });

  it('the long provider routes keep their 300 s on api.', () => {
    expect(vercelConfig('api').functions).toMatchObject({
      'src/app/api/garmin/connect/route.ts': { maxDuration: 300 },
      'src/app/api/coach/plan/route.ts': { maxDuration: 300 },
    });
  });

  it('each project rebuilds only for its own scope (scripts/ci/deploy-scopes.mjs)', () => {
    expect(vercelConfig('api').ignoreCommand).toBe(
      'node ../../scripts/ci/vercel-ignore-build.mjs --app api',
    );
    expect(vercelConfig('web').ignoreCommand).toBe(
      'node ../../scripts/ci/vercel-ignore-build.mjs --app web',
    );
  });
});
