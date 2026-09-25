/**
 * Live smoke for the `api.` host contract (JSON + Bearer only, no page, no cookie, CORS for
 * the thin web only).
 *
 * Usage:
 *   yarn smoke:api-host                          # https://api.sharpit.app
 *   SHARPIT_SMOKE_BEARER=… yarn smoke:api-host   # also reads Today with a Bearer
 *
 * The Bearer is read from the environment only — never pass it as an argument.
 */

import { runApiHostSmoke } from '../src/lib/ops/api-host-smoke';

const DEFAULT_ORIGIN = 'https://api.sharpit.app';

function parisTrainingDayId(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

async function main(): Promise<void> {
  const origin = (process.argv[2] ?? DEFAULT_ORIGIN).replace(/\/+$/, '');
  const bearer = process.env.SHARPIT_SMOKE_BEARER?.trim() || undefined;
  const results = await runApiHostSmoke(origin, { bearer, trainingDayId: parisTrainingDayId() });

  console.log(`\n${origin}`);
  for (const result of results) {
    const detail = result.reason ? ` — ${result.reason}` : '';
    console.log(`  ${result.outcome.toUpperCase().padEnd(7)} ${result.name}${detail}`);
  }
  process.exitCode = results.some((result) => result.outcome === 'fail') ? 1 : 0;
}

void main();
