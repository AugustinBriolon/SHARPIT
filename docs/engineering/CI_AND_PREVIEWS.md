# CI & Vercel preview speed

Speed up feature-branch CI and Vercel preview deploys **without** weakening
secret scanning on code changes.

## Vercel previews

Configured in [`vercel.json`](../../vercel.json):

| Setting | Behaviour |
| --- | --- |
| `ignoreCommand` | Runs [`scripts/ci/vercel-ignore-build.mjs`](../../scripts/ci/vercel-ignore-build.mjs). Exit `0` skips the build when **only** `docs/**` (incl. design screenshots) or root agent/architecture markdown changed. Exit `1` builds when `src/`, config, lockfiles, `.env*`, or any other app path changed. Unknown git range → build (fail open). |
| `github.autoJobCancelation: true` | New pushes on the same Git branch cancel obsolete queued/in-flight preview builds so the latest commit wins. |

### Local check of the ignore script

```bash
# Simulate a docs-only range (expect exit 0 = skip)
git diff --name-only HEAD^ HEAD   # inspect
node scripts/ci/vercel-ignore-build.mjs; echo $?

# Unit tests for the path rules
yarn vitest run src/lib/ci/vercel-ignore-build.test.ts
```

## GitHub Actions

### Presentation Architecture Guard

[`.github/workflows/presentation-architecture-guard.yml`](../../.github/workflows/presentation-architecture-guard.yml)

- `paths-ignore` for docs / markdown so docs-only PRs skip the heavy install + `yarn test` suite.
- `concurrency` with `cancel-in-progress: true` cancels obsolete runs on the same PR/ref.
- Yarn cache via `actions/setup-node` + `actions/cache` on `node_modules` / `.yarn/cache` keyed by `yarn.lock`.

### GitGuardian / secret audit

[`.github/workflows/gitguardian.yml`](../../.github/workflows/gitguardian.yml)

- **Runs ggshield** on PRs and `main` pushes whenever non-docs paths change (includes `src/`, lockfiles, `.env*`, workflows, config) **when** `GITGUARDIAN_API_KEY` is set.
- Feature branches are covered via `pull_request` only (avoids duplicate push+PR runs).
- **Skipped** on pure docs / screenshot / markdown-only changes (`paths-ignore`).
- If the Action secret is unset, the job warns and exits successfully; keep the **GitGuardian GitHub App** check ("GitGuardian Security Checks") enabled so secret audit stays on the critical path for code changes.
- To enable path-filtered ggshield in Actions: add repository secret `GITGUARDIAN_API_KEY`.

## Verify

1. Open a PR that only touches `docs/**` → Vercel deployment should cancel via ignore step; Guard + GitGuardian workflows should not run (paths-ignore).
2. Open a PR that changes `src/**` or `yarn.lock` → Vercel builds; Guard runs tests; GitGuardian scans.
3. Push twice quickly on the same feature branch → older preview/CI runs cancel in favour of the latest.
