/**
 * @deprecated Email/password SSO via Node fetch is a dead end (Garmin auth 2026).
 * Mint DI tokens with `scripts/garmin-login.py` (python-garminconnect ≥ 0.3) and
 * import via `/api/garmin/import-tokens` or `yarn garmin:import-tokens`.
 *
 * Kept only so older scripts fail loudly with an honest message.
 */
import { createInterface } from 'node:readline/promises';

async function main() {
  console.error(
    [
      'Node SSO login is disabled.',
      'Mint tokens locally:',
      '  pip install -r scripts/requirements-garmin.txt',
      '  python3 scripts/garmin-login.py',
      'Then import:',
      '  yarn garmin:import-tokens ./garmin_tokens.json',
    ].join('\n'),
  );
  void createInterface;
  process.exit(1);
}

main();
