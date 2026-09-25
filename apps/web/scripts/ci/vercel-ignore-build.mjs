#!/usr/bin/env node
/**
 * Vercel Ignored Build Step helper.
 *
 * Exit 0 → skip the build (docs / design screenshots only).
 * Exit 1 → proceed with the build (app-relevant changes, or unknown range).
 *
 * Keep building when src/, config, lockfiles, env templates, or other
 * non-docs paths change. Invoked via vercel.json `ignoreCommand`.
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
 * @param {string[]} files
 * @returns {boolean} true when the build should be skipped
 */
export function shouldIgnoreBuild(files) {
  if (!Array.isArray(files) || files.length === 0) {
    // Empty diff: nothing to ship — skip. Callers that cannot resolve a range
    // must exit 1 before calling this.
    return true;
  }
  return files.every(isIgnorablePath);
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

  if (shouldIgnoreBuild(files)) {
    console.log(
      `Only docs/screenshots (or empty) changed (${files.length} file(s)) — skipping build`,
    );
    process.exit(0);
  }

  const relevant = files.filter((f) => !isIgnorablePath(f));
  console.log(
    `App-relevant changes detected (${relevant.slice(0, 8).join(', ') || '…'}) — building`,
  );
  process.exit(1);
}

const invokedAsCli = process.argv[1]?.includes('vercel-ignore-build');
if (invokedAsCli) {
  main();
}
