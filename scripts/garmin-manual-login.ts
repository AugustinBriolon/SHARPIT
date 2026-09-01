/**
 * One-off local helper to mint DI tokens via the widget SSO path (no clientId).
 *
 * Prefer reconnecting in the app UI (prod encrypts with prod's
 * SECRET_ENCRYPTION_KEY). Copying tokens across envs is unsupported — keys differ.
 *
 * Run locally: `yarn tsx scripts/garmin-manual-login.ts`
 */
import { loginGarminWidget } from '@/lib/integrations/garmin/garmin-widget-auth';
import { diTokensToGarminTokens } from '@/lib/integrations/garmin/garmin';
import { createInterface } from 'node:readline/promises';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  console.info(
    'Note: do not paste these tokens into another environment — encryption keys differ.',
  );
  const username = await prompt('Email Garmin: ');
  const password = await prompt('Mot de passe Garmin: ');

  const di = await loginGarminWidget(username, password, {
    // Local scripts can skip the anti-WAF delay when debugging.
    sleep: async () => undefined,
  });
  const tokens = diTokensToGarminTokens(di);

  console.info('\n--- Tokens DI (stockage app) ---\n');
  console.info(JSON.stringify(tokens));
  console.info('\n--- fin ---');
}

main().catch((error) => {
  console.error('Échec de la connexion Garmin:', error);
  process.exit(1);
});
