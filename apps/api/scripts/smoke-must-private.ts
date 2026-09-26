/**
 * Live smoke for the private "Must" (Garmin Safari + universal link, Today with a Bearer).
 *
 * Usage:
 *   yarn smoke:must-private                                  # https://sharpit.app
 *   yarn smoke:must-private https://sharpit.app https://web.sharpit.app
 *   SHARPIT_SMOKE_BEARER=… yarn smoke:must-private           # also reads Today
 *
 * The Bearer is a short-lived Clerk session token taken from a signed-in device. It is
 * read from the environment only — never pass it as an argument, never paste it in logs.
 */

import { runMustPrivateSmoke, type SmokeResult } from '@sharpit/server/lib/ops/must-private-smoke';

const DEFAULT_ORIGINS = ['https://sharpit.app'];

/** Training day in the athletes' time zone, as the app computes it. */
function parisTrainingDayId(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

function printResults(origin: string, results: SmokeResult[]): void {
  console.log(`\n${origin}`);
  for (const result of results) {
    const detail = result.reason ? ` — ${result.reason}` : '';
    console.log(`  ${result.outcome.toUpperCase().padEnd(7)} ${result.name}${detail}`);
  }
}

async function main(): Promise<void> {
  const origins = process.argv.slice(2).map((origin) => origin.replace(/\/+$/, ''));
  const bearer = process.env.SHARPIT_SMOKE_BEARER?.trim() || undefined;
  const trainingDayId = parisTrainingDayId();
  let failed = false;

  for (const origin of origins.length > 0 ? origins : DEFAULT_ORIGINS) {
    const results = await runMustPrivateSmoke(origin, { bearer, trainingDayId });
    printResults(origin, results);
    failed ||= results.some((result) => result.outcome === 'fail');
  }
  process.exitCode = failed ? 1 : 0;
}

void main();
