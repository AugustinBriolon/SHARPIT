import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_APP = join('..', 'web', 'src', 'app');

/**
 * ADR-048 phase 3f: `api.` is the only app serving route handlers under `/api/` — the native
 * contract, the crons, the web's reads and writes. The web keeps pages only.
 */
describe('api route mounts', () => {
  it('the web serves no /api route', () => {
    expect(existsSync(join(WEB_APP, 'api'))).toBe(false);
  });
});
