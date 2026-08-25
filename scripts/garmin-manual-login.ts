/**
 * One-off helper for when Garmin's login endpoint rate-limits the app's
 * server IP but not the machine this script runs on (see the connect
 * failure investigation — 429 on the SSO ticket exchange from production,
 * fine from a home/office connection).
 *
 * Run locally: `yarn tsx scripts/garmin-manual-login.ts`
 * Prints a JSON blob of tokens to paste into the "coller des tokens" field
 * on the Garmin integration panel in Settings, in production. It never
 * touches this app's database — it only talks to Garmin directly, exactly
 * like the normal login flow does, just from your machine instead of the
 * server.
 *
 * Password is entered in plain sight (no masking) — this is a local,
 * one-off script you run yourself, not a shared tool.
 */
import { createInterface } from 'node:readline/promises';
import { GarminConnect } from '@flow-js/garmin-connect';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  const username = await prompt('Email Garmin: ');
  const password = await prompt('Mot de passe Garmin: ');

  const client = new GarminConnect({ username, password });
  await client.login();
  const tokens = client.exportToken();

  console.info('\n--- Colle le bloc ci-dessous dans le champ "tokens" de la page Garmin ---\n');
  console.info(JSON.stringify(tokens));
  console.info('\n--- fin ---');
}

main().catch((error) => {
  console.error('Échec de la connexion Garmin:', error);
  process.exit(1);
});
