#!/usr/bin/env node
/**
 * Vercel Ignored Build Step helper, shared by every app of the monorepo.
 *
 * Exit 0 → skip the build (docs / design screenshots only, or nothing in the app's scope).
 * Exit 1 → proceed with the build (app-relevant changes, or unknown range).
 *
 * Compares everything pushed since the last deployment (`VERCEL_GIT_PREVIOUS_SHA`), not only
 * the last commit. `--scope a,b` limits the build to changes under those repo paths (an app,
 * the packages it builds from, the root manifests). Invoked via vercel.json `ignoreCommand`
 * from the app directory: `node ../../scripts/ci/vercel-ignore-build.mjs [--scope …]`.
 */

/**
 * Paths that never alone justify a preview/production rebuild.
 * Design screenshots live under docs/design/** (png/webp/…).
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isIgnorablePath(file) {
  const normalized = file.replace(/^\.\//, '');
  if (normalized.startsWith('docs/')) return true;
  // Root agent / architecture markdown that does not ship in the app bundle
  if (/^(README|ARCHITECTURE|AGENTS|CLAUDE|CODE_MAP|FEATURE_EXTRACTION)\.md$/i.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * @param {string} file
 * @param {string[] | null} scope repo paths the app builds from; null = everything
 * @returns {boolean}
 */
function isInScope(file, scope) {
  return !scope || scope.some((path) => file === path || file.startsWith(`${path}/`));
}

/**
 * @param {string[]} files repo-relative paths
 * @param {string[] | null} [scope]
 * @returns {boolean} true when the build should be skipped
 */
export function shouldIgnoreBuild(files, scope = null) {
  if (!Array.isArray(files) || files.length === 0) {
    // Empty diff: the same commit again — a redeploy someone asked for (to apply
    // changed environment variables, for one). Build it.
    return false;
  }
  return files.every((file) => isIgnorablePath(file) || !isInScope(file, scope));
}

/**
 * @param {string[]} argv
 * @returns {string[] | null}
 */
export function parseScope(argv) {
  const index = argv.indexOf('--scope');
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value ? value.split(',').filter(Boolean) : null;
}

/**
 * Resolve the git range Vercel should compare.
 * Prefers VERCEL_GIT_PREVIOUS_SHA when present.
 *
 * @param {{ previousSha?: string | null; hasParent?: boolean }} [opts]
 * @returns {{ start: string; end: string } | null}
 */
export function resolveDiffRange(opts = {}) {
  const previous = opts.previousSha ?? process.env.VERCEL_GIT_PREVIOUS_SHA ?? '';
  if (previous && previous !== '0000000000000000000000000000000000000000') {
    return { start: previous, end: 'HEAD' };
  }
  if (opts.hasParent === false) return null;
  return { start: 'HEAD^', end: 'HEAD' };
}

async function main() {
  const { execFileSync } = await import('node:child_process');

  let hasParent = true;
  try {
    execFileSync('git', ['rev-parse', '--verify', 'HEAD^'], {
      stdio: 'ignore',
    });
  } catch {
    hasParent = false;
  }

  const range = resolveDiffRange({ hasParent });
  if (!range) {
    console.log('No previous commit available — proceeding with build');
    process.exit(1);
  }

  let files;
  try {
    const out = execFileSync('git', ['diff', '--name-only', range.start, range.end], {
      encoding: 'utf8',
    });
    files = out
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Unable to diff ${range.start}..${range.end} (${message}) — proceeding with build`);
    process.exit(1);
  }

  const scope = parseScope(process.argv);
  if (shouldIgnoreBuild(files, scope)) {
    console.log(
      `Only docs/screenshots or paths outside ${scope?.join(', ') ?? 'the app'} changed (${files.length} file(s)) — skipping build`,
    );
    process.exit(0);
  }

  const relevant = files.filter((f) => !isIgnorablePath(f) && isInScope(f, scope));
  console.log(
    `App-relevant changes detected (${relevant.slice(0, 8).join(', ') || '…'}) — building`,
  );
  process.exit(1);
}

const invokedAsCli = process.argv[1]?.includes('vercel-ignore-build');
if (invokedAsCli) {
  main();
}
