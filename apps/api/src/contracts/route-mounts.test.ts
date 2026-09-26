import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const API_ROUTES = join('src', 'app', 'api');
const WEB_ROUTES = join('..', 'web', 'src', 'app', 'api');

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
  const mounts = routeFiles(API_ROUTES);

  it('serves the native contract, the coach stream and the crons — nothing else', () => {
    const paths = mounts.map((file) => relative(API_ROUTES, file));
    expect(paths.filter((path) => path.startsWith('v1/')).length).toBeGreaterThan(40);
    expect(paths).toContain(join('coach', 'chat', 'route.ts'));
    expect(
      paths.every(
        (path) =>
          path.startsWith(`v1/`) || path.startsWith('cron/') || path === 'coach/chat/route.ts',
      ),
    ).toBe(true);
  });

  // Until the web stops serving these routes (phase 3, ADR-048), both apps mount the same handler
  // with the same segment config: a route cannot drift between api. and the web.
  const shared = mounts
    .map((file) => relative(API_ROUTES, file))
    .filter((path) => existsSync(join(WEB_ROUTES, path)));

  it.each(shared)('%s matches the web mount', (path) => {
    const web = join(WEB_ROUTES, path);
    expect(readFileSync(join(API_ROUTES, path), 'utf8')).toBe(readFileSync(web, 'utf8'));
  });

  it('is the only app mounting the crons', () => {
    expect(existsSync(join(WEB_ROUTES, 'cron'))).toBe(false);
  });

  it('mounts every native route the web mounts', () => {
    const webNative = routeFiles(join(WEB_ROUTES, 'v1')).map((file) => relative(WEB_ROUTES, file));
    const apiPaths = new Set(mounts.map((file) => relative(API_ROUTES, file)));
    expect(webNative.filter((path) => !apiPaths.has(path))).toEqual([]);
  });
});
