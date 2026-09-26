import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const API_ROUTES = join('src', 'app', 'api');
const WEB_ROUTES = join('..', 'web', 'src', 'app', 'api');

/** Web-only mounts (none since the demo became a Clerk account). */
const WEB_ONLY_MOUNTS = new Set<string>();

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return routeFiles(path);
    }
    return entry === 'route.ts' ? [path] : [];
  });
}

describe('api route mounts', () => {
  const mounts = routeFiles(API_ROUTES).map((file) => relative(API_ROUTES, file));
  const webMounts = existsSync(WEB_ROUTES)
    ? routeFiles(WEB_ROUTES).map((file) => relative(WEB_ROUTES, file))
    : [];

  it('serves the native contract, the crons and the web routes — nothing else', () => {
    expect(mounts.filter((path) => path.startsWith('v1/')).length).toBeGreaterThan(40);
    const unexpected = mounts.filter(
      (path) => !path.startsWith('v1/') && !path.startsWith('cron/') && !webMounts.includes(path),
    );
    expect(unexpected).toEqual([]);
  });

  // ADR-048 phase 3: the web calls `api.` for everything it reads or writes.
  it('mounts every web route but the web-only ones', () => {
    const missing = webMounts.filter(
      (path) => !WEB_ONLY_MOUNTS.has(path) && !mounts.includes(path),
    );
    expect(missing).toEqual([]);
  });

  // A route both apps mount mounts the same handler with the same segment config: it cannot
  // drift between api. and the web while the web still serves it.
  const shared = mounts.filter((path) => webMounts.includes(path));

  it.each(shared)('%s matches the web mount', (path) => {
    expect(readFileSync(join(API_ROUTES, path), 'utf8')).toBe(
      readFileSync(join(WEB_ROUTES, path), 'utf8'),
    );
  });

  it('is the only app mounting the crons', () => {
    expect(existsSync(join(WEB_ROUTES, 'cron'))).toBe(false);
  });

  it('is the only app serving the native contract', () => {
    expect(existsSync(join(WEB_ROUTES, 'v1'))).toBe(false);
  });
});
