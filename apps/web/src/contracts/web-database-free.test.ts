import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ADR-048 phase 3f: the web reads and writes through `api.` only. This follows every
 * `@sharpit/server` import of the web app (transitively, type-only imports excluded) and
 * lists the web files that still reach the database client. The list only shrinks; empty,
 * `@sharpit/db` leaves `apps/web`.
 */
const WEB_SRC = 'src';
const SERVER_SRC = join('..', '..', 'packages', 'server', 'src');
const SERVER_EXPORTS: Record<string, string> = JSON.parse(
  readFileSync(join('..', '..', 'packages', 'server', 'package.json'), 'utf8'),
).exports;
const IMPORT =
  /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const TYPE_ONLY = /(?:import|export) type[^;]*;/g;
const REACHES_DATABASE = /from ['"]@sharpit\/db\/client['"]/;

/** Web files still reading the database directly — to move onto `api.`. */
const STILL_ON_THE_DATABASE = new Set<string>([
  'app/(app)/activite/[id]/edit/page.tsx',
  'app/(app)/activite/[id]/page.tsx',
  'app/(app)/activite/sejours/[id]/page.tsx',
  'app/(app)/coach/page.tsx',
  'app/(app)/journal/analyses/page.tsx',
  'app/(app)/moi/calibration/page.tsx',
  'app/(app)/settings/account/page.tsx',
  'app/(app)/settings/equipment/page.tsx',
  'app/admin/page.tsx',
  'app/connect/garmin/start/route.ts',
  'app/onboarding/page.tsx',
  'app/start/route.ts',
  'components/analytics/records/records-panel.tsx',
  'components/onboarding/gate/onboarding-gate.tsx',
  'components/privacy/privacy-consent-gate.tsx',
  'components/settings/integrations/hub-section-load.ts',
  'components/settings/integrations/hub-section.tsx',
  'components/settings/pro/pro-showcase.tsx',
  'components/shell/moi-hub.tsx',
  'components/training/activity/detail/activity-context-chips.tsx',
  'components/training/weekly-review/weekly-review-gate.tsx',
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === 'api' && dir.endsWith(join('src', 'app')) ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

function resolveServer(specifier: string, from: string): string | null {
  let base: string;
  if (specifier.startsWith('@sharpit/server/')) {
    const subpath = specifier.slice('@sharpit/server/'.length);
    const exported = SERVER_EXPORTS[`./${subpath}`];
    if (exported) {
      return join(SERVER_SRC, '..', exported);
    }
    base = join(SERVER_SRC, subpath);
  } else if (specifier.startsWith('.') && from.startsWith(SERVER_SRC)) {
    base = join(dirname(from), specifier);
  } else {
    return null;
  }
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')];
  return candidates.find((path) => existsSync(path) && statSync(path).isFile()) ?? null;
}

const reaches = new Map<string, boolean>();

function reachesDatabase(file: string, visiting = new Set<string>()): boolean {
  const known = reaches.get(file);
  if (known !== undefined) {
    return known;
  }
  if (visiting.has(file)) {
    return false;
  }
  visiting.add(file);
  const source = readFileSync(file, 'utf8').replace(TYPE_ONLY, '');
  const result =
    REACHES_DATABASE.test(source) ||
    [...source.matchAll(IMPORT)].some((match) => {
      const target = resolveServer(match[1] ?? match[2], file);
      return target !== null && reachesDatabase(target, visiting);
    });
  reaches.set(file, result);
  return result;
}

describe('web without a database', () => {
  const offenders = sourceFiles(WEB_SRC)
    .filter((file) => {
      const source = readFileSync(file, 'utf8').replace(TYPE_ONLY, '');
      return [...source.matchAll(IMPORT)].some((match) => {
        const target = resolveServer(match[1] ?? match[2], file);
        return target !== null && reachesDatabase(target);
      });
    })
    .map((file) => relative(WEB_SRC, file))
    .sort();

  it('lists exactly the web files still reading the database', () => {
    expect(offenders).toEqual([...STILL_ON_THE_DATABASE].sort());
  });
});
