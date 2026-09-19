/**
 * Writes the generated Swift token file into the native iOS client (ADR-041).
 *
 * Usage:
 *   yarn tokens:ios                    # write to the sibling SHARPIT-APP checkout
 *   yarn tokens:ios --check            # fail if the committed file is stale
 *   yarn tokens:ios path/to/File.swift # write elsewhere
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPORTED_COLORS, renderIosTokens } from '../src/lib/brand/ios-token-export';

const GLOBALS_CSS = resolve(import.meta.dirname, '../src/app/globals.css');
const DEFAULT_OUTPUT = resolve(
  import.meta.dirname,
  '../../SHARPIT-APP/SHARPIT-APP/DesignSystem/SharpitTokens.generated.swift',
);

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const outputPath = resolve(
  process.cwd(),
  args.find((arg) => !arg.startsWith('--')) ?? DEFAULT_OUTPUT,
);

const generated = renderIosTokens(readFileSync(GLOBALS_CSS, 'utf8'));

if (checkOnly) {
  if (readFileSync(outputPath, 'utf8') !== generated) {
    console.error(`${outputPath} is stale. Run \`yarn tokens:ios\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${outputPath} is up to date.`);
} else {
  writeFileSync(outputPath, generated);
  console.log(`Wrote ${EXPORTED_COLORS.length} colors to ${outputPath}`);
}
