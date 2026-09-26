import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

type VercelConfig = { crons?: Array<{ path: string; schedule: string }> };

const read = (file: string): VercelConfig => JSON.parse(readFileSync(file, 'utf8')) as VercelConfig;

describe('crons', () => {
  const crons = read('vercel.json').crons ?? [];

  it('run from sharpit-api only, which holds CRON_SECRET and the push key', () => {
    expect(crons.length).toBeGreaterThan(0);
    expect(read(join('..', 'web', 'vercel.json')).crons ?? []).toEqual([]);
  });

  it.each(crons.map((cron) => cron.path))('%s is mounted in this app', (path) => {
    expect(existsSync(join('src', 'app', `${path}`, 'route.ts'))).toBe(true);
  });
});
