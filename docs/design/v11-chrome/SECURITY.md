# Security audit — `liquid-glass-react@1.1.1`

Pinned exact version (no `^` / `~`) in `package.json` + Yarn `resolutions`, locked in `yarn.lock`. Package manager: Yarn 4 (`package-lock.json` is gitignored).

| Field | Value |
| --- | --- |
| Package | `liquid-glass-react@1.1.1` |
| Registry integrity | `sha512-pKzaktaMAEztd93wpWcz2Z5Z9qdLJUNJdMX+n00Ca4XsnrLTQ5xJzm/+GQXZUeuFXe/PQ8ziVMZO6531PyaFJw==` |
| License | MIT (copyright 2025 Max Rovensky) |
| npm maintainers | `fivepointseven <fivepointseven@icloud.com>` |
| Published | 2025-06-11 (versions 0.0.1→1.1.1 within ~24h) |
| Runtime dependencies | **none** (peer: `react` / `react-dom` ≥19) |
| Install scripts | **none** — scripts are build / `prepublishOnly` only (run by publisher, not on consumer install) |

## Scripts check

Published `package.json` scripts: `build*`, `clean`, `dev`, `prepublishOnly`. No `preinstall` / `install` / `postinstall`.

## Bundle check (`dist/`)

- Canvas 2D for displacement map generation (expected for the effect).
- No matches for `eval`, `Function(`, `child_process`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `document.cookie`, or install-hook strings in published files.

## Related npm name (not a dependency)

`liquid-glass@1.0.0` (ISC, maintainer `evanbacon`) is a **different** package and is **not** installed via this dependency. Do not confuse the two.

## Product constraint

Glass via `ChromeGlass` is chrome-only (tab bar / floating back; toast optional later). Never on `/consent`, `/privacy`, `/terms`, or Confidentialité content. Enforced by import allowlist test: `src/components/chrome/chrome-glass-scope.test.ts`.
