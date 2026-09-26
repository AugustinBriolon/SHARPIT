import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function vercelConfig(app: 'api' | 'web'): { buildCommand?: string; functions?: object } {
  const path = app === 'api' ? 'vercel.json' : '../web/vercel.json';
  return JSON.parse(readFileSync(path, 'utf8')) as { buildCommand?: string };
}

/** ADR-048 phase 3: one migration owner — the project holding the database, not the web. */
describe('migration owner', () => {
  it('sharpit-api migrates before it builds', () => {
    expect(vercelConfig('api').buildCommand).toBe('yarn db:migrate:deploy && yarn build');
  });

  it('the web project never migrates', () => {
    expect(vercelConfig('web').buildCommand).not.toContain('migrate');
  });

  it('api. gives the long provider routes the durations the web gave them', () => {
    expect(vercelConfig('api').functions).toMatchObject(vercelConfig('web').functions ?? {});
  });
});
