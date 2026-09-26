/**
 * Copies Production environment variables from one Vercel project to another through the Vercel
 * API, so multi-line values (the APNs .p8 key) arrive byte for byte. Never prints a value.
 *
 * Run it yourself — it moves secrets:
 *   node apps/api/scripts/copy-vercel-env.mjs sharpit sharpit-api NAME [NAME…]
 *
 * Variables Vercel stores as "sensitive" cannot be read back; they are listed so you add them
 * by hand (`vercel env add <NAME> production` in apps/api).
 */
import { execFileSync } from 'node:child_process';

/**
 * @param {Array<{ key: string; type: string; target?: string[]; value?: string; id: string }>} sourceEnv
 * @param {string[]} names
 * @param {Set<string>} alreadyOnTarget
 */
export function planEnvCopy(sourceEnv, names, alreadyOnTarget) {
  /** @type {{ copy: Array<{ key: string; value: string; type: 'plain' | 'encrypted' }>; sensitive: string[]; missing: string[]; present: string[] }} */
  const plan = { copy: [], sensitive: [], missing: [], present: [] };
  for (const name of names) {
    if (alreadyOnTarget.has(name)) {
      plan.present.push(name);
      continue;
    }
    const entry = sourceEnv.find(
      (env) => env.key === name && (env.target ?? []).includes('production'),
    );
    if (!entry) {
      plan.missing.push(name);
    } else if (entry.type === 'sensitive' || typeof entry.value !== 'string') {
      plan.sensitive.push(name);
    } else {
      plan.copy.push({
        key: name,
        value: entry.value,
        type: entry.type === 'plain' ? 'plain' : 'encrypted',
      });
    }
  }
  return plan;
}

function vercelApi(path, body) {
  const args = ['api', path];
  if (body) {
    args.push('-X', 'POST', '--input', '-');
  }
  const out = execFileSync('vercel', args, {
    input: body ? JSON.stringify(body) : undefined,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  return JSON.parse(out);
}

function main() {
  const [from, to, ...names] = process.argv.slice(2);
  if (!from || !to || names.length === 0) {
    console.error('Usage: node copy-vercel-env.mjs <from-project> <to-project> NAME [NAME…]');
    process.exit(2);
  }
  const source = vercelApi(`/v10/projects/${from}/env?decrypt=true`).envs;
  const target = new Set(vercelApi(`/v10/projects/${to}/env`).envs.map((env) => env.key));
  const plan = planEnvCopy(source, names, target);
  for (const { key, value, type } of plan.copy) {
    vercelApi(`/v10/projects/${to}/env`, { key, value, type, target: ['production'] });
    console.log(`copied    ${key}`);
  }
  for (const key of plan.present) console.log(`kept      ${key} (already on ${to})`);
  for (const key of plan.sensitive) console.log(`BY HAND   ${key} (sensitive on ${from})`);
  for (const key of plan.missing) console.log(`missing   ${key} (not set on ${from})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
