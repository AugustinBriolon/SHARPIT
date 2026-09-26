import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return routeFiles(path);
    }
    return path.endsWith('route.ts') ? [path] : [];
  });
}

describe('api host contract', () => {
  it('no /api/v1 route or the coach stream sets a cookie', () => {
    const files = [...routeFiles('src/app/api/v1'), 'src/app/api/coach/chat/route.ts'];
    const offenders = files.filter((file) =>
      /cookies\(\)\.set|\.cookies\.set\(|['"]set-cookie['"]/i.test(readFileSync(file, 'utf8')),
    );
    expect(files.length).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });
});
