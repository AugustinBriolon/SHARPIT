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

  it('each project rebuilds only for what it is built from', () => {
    const manifests = 'package.json,yarn.lock,turbo.json';
    expect(vercelConfig('api').ignoreCommand).toContain(`--scope apps/api,packages,${manifests}`);
    // The web never builds from the server package (ADR-050); it still generates the Prisma
    // client for enum values, hence the schema.
    expect(vercelConfig('web').ignoreCommand).toContain(
      `--scope apps/web,packages/app,packages/core,packages/shared,packages/eslint-config,packages/db/prisma,${manifests}`,
    );
  });
});
