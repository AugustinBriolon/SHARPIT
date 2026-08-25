/**
 * Copies one athlete's `GarminAccount` row from the local docker Postgres
 * into Neon (prod) — the reverse of `pull-from-neon.sh`.
 *
 * Why: Garmin's login endpoint is rate-limiting this app's *server* IP, not
 * a home/office connection. Connecting Garmin from `yarn dev` locally works
 * and writes valid oauth1/oauth2 tokens into the local `GarminAccount` row.
 * This script relocates just that row to Neon so production can use it —
 * no app code involved.
 *
 * Tokens are decrypted with the LOCAL encryption key and re-encrypted with
 * the PROD one — they're almost certainly not the same key (prod requires
 * SECRET_ENCRYPTION_KEY explicitly; local dev falls back to a fixed
 * insecure default when unset), so a raw column copy would leave prod with
 * tokens it can't read. Decryption uses AES-GCM, which fails loudly on a
 * wrong key rather than silently producing garbage — if the local key
 * guessed here is wrong, this script will error out immediately instead of
 * writing corrupt data.
 *
 * Usage:
 *   NEON_SECRET_ENCRYPTION_KEY=<prod's real SECRET_ENCRYPTION_KEY, from Vercel> \
 *     yarn tsx scripts/push-garmin-account-to-neon.ts [athleteId]
 *
 * If athleteId is omitted, the script uses it only when the local
 * `GarminAccount` table has exactly one row.
 *
 * Requires: docker compose up -d (local db running with a connected Garmin
 * account), and NEON_DIRECT_URL env var or a `DIRECT_URL=...neon.tech...`
 * line in .env (same convention as pull-from-neon.sh).
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret } from '@/lib/secret-box';

const LOCAL_URL =
  process.env.LOCAL_DATABASE_URL ?? 'postgresql://sharpit:sharpit@localhost:5432/sharpit';

function readEnvFile(): Record<string, string> {
  try {
    const content = readFileSync('.env', 'utf8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^#?\s*([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (match) vars[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
    return vars;
  } catch {
    return {};
  }
}

function resolveNeonUrl(envVars: Record<string, string>): string {
  if (process.env.NEON_DIRECT_URL) return process.env.NEON_DIRECT_URL;
  if (envVars.DIRECT_URL?.includes('neon.tech')) return envVars.DIRECT_URL;
  throw new Error(
    'Définis NEON_DIRECT_URL, ou garde une ligne DIRECT_URL=...neon.tech... (même commentée) dans .env',
  );
}

/**
 * Best-effort reconstruction of the key `yarn dev` used locally: same
 * priority order as `encryptionKey()` in src/lib/secret-box.ts. A wrong
 * guess here fails the decrypt below with a clear error, not silent
 * corruption — so this doesn't need to be perfect, just tried.
 */
function resolveLocalKey(envVars: Record<string, string>): string {
  return (
    process.env.SECRET_ENCRYPTION_KEY ??
    envVars.SECRET_ENCRYPTION_KEY ??
    envVars.CRON_SECRET ??
    envVars.DATABASE_URL ??
    'sharpit-dev-insecure'
  );
}

function withEncryptionKey<T>(key: string, fn: () => T): T {
  const previous = process.env.SECRET_ENCRYPTION_KEY;
  process.env.SECRET_ENCRYPTION_KEY = key;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.SECRET_ENCRYPTION_KEY;
    else process.env.SECRET_ENCRYPTION_KEY = previous;
  }
}

async function main() {
  const neonKey = process.env.NEON_SECRET_ENCRYPTION_KEY;
  if (!neonKey) {
    throw new Error(
      'NEON_SECRET_ENCRYPTION_KEY manquant — copie la valeur SECRET_ENCRYPTION_KEY de prod ' +
        '(Vercel → projet → Environment Variables) et repasse-la en variable d’env pour cette commande.',
    );
  }

  const envVars = readEnvFile();
  const localKey = resolveLocalKey(envVars);
  const neonUrl = resolveNeonUrl(envVars);
  const [, , athleteIdArg] = process.argv;

  const local = new PrismaClient({ datasources: { db: { url: LOCAL_URL } } });
  const neon = new PrismaClient({ datasources: { db: { url: neonUrl } } });

  try {
    const account = athleteIdArg
      ? await local.garminAccount.findUnique({ where: { athleteId: athleteIdArg } })
      : await (async () => {
          const rows = await local.garminAccount.findMany();
          if (rows.length !== 1) {
            throw new Error(
              rows.length === 0
                ? 'Aucun GarminAccount en local — connecte Garmin via `yarn dev` puis relance.'
                : `${rows.length} GarminAccount en local — précise l'athleteId en argument.`,
            );
          }
          return rows[0];
        })();

    if (!account) {
      throw new Error(`Aucun GarminAccount local pour athleteId=${athleteIdArg}`);
    }

    const targetExists = await neon.athleteProfile.findUnique({
      where: { id: account.athleteId },
      select: { id: true },
    });
    if (!targetExists) {
      throw new Error(
        `Aucun AthleteProfile Neon pour athleteId=${account.athleteId} — vérifie que c'est bien le même compte.`,
      );
    }

    // Decrypt with the local key, re-encrypt with prod's — never write the
    // raw local ciphertext into a database that decrypts with a different key.
    const oauth1Json = withEncryptionKey(localKey, () => decryptSecret(account.oauth1TokenEnc));
    const oauth2Json = withEncryptionKey(localKey, () => decryptSecret(account.oauth2TokenEnc));
    const oauth1TokenEnc = withEncryptionKey(neonKey, () => encryptSecret(oauth1Json));
    const oauth2TokenEnc = withEncryptionKey(neonKey, () => encryptSecret(oauth2Json));

    await neon.garminAccount.upsert({
      where: { athleteId: account.athleteId },
      create: {
        athleteId: account.athleteId,
        displayName: account.displayName,
        fullName: account.fullName,
        oauth1TokenEnc,
        oauth2TokenEnc,
      },
      update: {
        displayName: account.displayName,
        fullName: account.fullName,
        oauth1TokenEnc,
        oauth2TokenEnc,
      },
    });

    console.info(`✓ GarminAccount (athleteId=${account.athleteId}) copié vers Neon.`);
  } finally {
    await local.$disconnect();
    await neon.$disconnect();
  }
}

main().catch((error) => {
  console.error('Échec:', error instanceof Error ? error.message : error);
  process.exit(1);
});
