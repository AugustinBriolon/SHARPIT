# ADR-009: Turbopack builds and Serwist in configurator mode

**Status:** Accepted  
**Date:** 2026-08-10  
**Author:** Augustin Briolon  
**Supersedes:** N/A

---

## Context

Since the PWA landed, `yarn build` has run `next build --webpack`. The reason was never documented in the repo, but it is structural: `@serwist/next` integrates as a **webpack plugin**. Its entry point prints an explicit warning when it detects Turbopack ("You are using '@serwist/next' with `next dev --turbopack`, but it doesn't support Turbopack") and its whole implementation hangs off a `webpack(config, options)` hook. Passing `--webpack` was the only way to keep the service worker being generated.

Next.js 16.3 makes that trade-off expensive. Turbopack's FileSystem cache is now enabled by default for `next build` (`turbopackFileSystemCacheForBuild`), so repeat builds start warm. Staying on webpack forfeits it entirely, and also forfeits any future Turbopack-only capability (the Rust React Compiler among them).

Serwist ships a second integration path — **configurator mode** (`@serwist/next/config`) — where the service worker is built by the `serwist` CLI as a separate step instead of by a bundler plugin. `@serwist/cli` was already a devDependency of this project, unused.

Two facts about the existing setup made the migration lower-risk than it looked:

1. **Registration was already manual.** `SwRegister` calls `navigator.serviceWorker.register('/sw.js')` directly. The plugin's injected client entry (`sw-entry.mjs`) — the source of the `register`, `reloadOnOnline`, and `cacheOnNavigation` options — was configured off (`register: false`) and never used. `window.serwist` appears nowhere in `src/`.
2. **`globPublicPatterns` was dead config.** In the plugin, `additionalPrecacheEntries` _replaces_ the public-directory glob rather than adding to it. Because the config set `additionalPrecacheEntries: [{ url: '/~offline', revision }]`, the declared `globPublicPatterns` (icons and favicons) were silently never precached.

---

## Decision

Build with Turbopack (`next build`, no `--webpack`) and generate the service worker with Serwist in configurator mode: a root-level `serwist.config.mjs` consumed by `serwist build` as the second step of `yarn build`.

---

## Rationale

Configurator mode is the only Serwist path that is stable _and_ bundler-agnostic. `@serwist/turbopack` exists but is explicitly experimental; putting the offline guarantees of ADR-008 behind an experimental integration is a worse trade than moving the SW build out of the bundler entirely.

Decoupling is also the more honest architecture. Generating the service worker is a **post-build packaging step** over the build output, not a concern of module bundling. Expressing it as its own CLI invocation over `.next/static` and `public/` says that plainly, and it survives whatever Next.js does to its bundler next.

Measured on this repo, cold `next build`: **49s → 19s**. Warm (Turbopack cache present): **8.5s**, ~5.7x faster than the webpack baseline.

---

## Alternatives Considered

### Alternative 1: Stay on `next build --webpack`

**Description:** Keep the plugin, accept webpack builds.

**Pros:**

- Zero change, zero risk to the PWA.
- Precache manifest keeps being derived from the webpack compilation, which knows exactly which assets shipped.

**Cons:**

- Forfeits the Turbopack build cache — the single largest build-time win in 16.3.
- Locks the project to a bundler Next.js is actively moving away from.
- Blocks the Rust React Compiler, which runs inside Turbopack.

**Rejected because:** it trades a permanent architectural constraint for a convenience that configurator mode reproduces.

### Alternative 2: Migrate to `@serwist/turbopack`

**Description:** Swap the webpack plugin for Serwist's experimental Turbopack integration, keeping the SW build inside the bundler.

**Pros:**

- Closest to the current shape — still a bundler plugin, still one command.
- Keeps compilation-aware manifest generation.

**Cons:**

- Explicitly experimental; Serwist's own docs label it as such.
- Couples the offline guarantee (ADR-008) to an unstable integration.

**Rejected because:** the PWA is load-bearing for the Morning Experience offline. Configurator mode reaches the same outcome on a stable path.

---

## Consequences

### Positive

- Cold builds ~2.6x faster, warm builds ~5.7x faster.
- The precache manifest is now **explicit**: `serwist.config.mjs` names exactly what is precached (`.next/static` JS/CSS/fonts, the icon and favicon set, `/~offline` at the current git revision) rather than inheriting whatever the bundler happened to emit.
- Fixes the latent `globPublicPatterns` bug — icons and favicons are precached for the first time (166 URLs, 6.88 MB) and now genuinely survive offline.
- Dev is no longer involved in service-worker concerns at all; the `disable: NODE_ENV === 'development'` escape hatch and the Turbopack incompatibility warning both disappear.

### Negative

- The precache manifest is glob-derived, not compilation-derived. A new asset type under `.next/static` (say, a new font format) will be silently missed until `serwist.config.mjs` is updated. This is the real cost of decoupling.
- `yarn build` is now two commands; a failure in the second leaves a successful Next build with a stale `public/sw.js`.
- `@serwist/cli` moves from unused devDependency to a production-build dependency. Vercel installs devDependencies during builds, so this works, but it is now load-bearing.

### Scientific debt created

- None.

---

## Review Criteria

Revisit if any of the following holds:

- `@serwist/turbopack` reaches stable and offers compilation-aware manifest generation under Turbopack — the glob-derived manifest is the one real regression here and that would undo it.
- A shipped asset is found missing from the precache manifest, indicating the glob patterns have drifted from what the build emits.
- Next.js changes how `public/` is collected during a build such that writing `public/sw.js` mid-build no longer lands in the deployed output.
- The build environment stops preserving `.next/cache` (making the Turbopack build cache moot), which would remove most of the reason for this decision.
