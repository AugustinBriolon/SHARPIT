<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SHARPIT — Agent context

**Phase:** Stabilization — Core frozen. Express the Digital Twin vertically; do not add core engines.

**Before implementing, read:**

- [`docs/models/CORE_ARCHITECTURE.md`](docs/models/CORE_ARCHITECTURE.md) — **architectural constitution** (frozen Core)
- [`docs/product/PRODUCT.md`](docs/product/PRODUCT.md) — constitution, execution doctrine, athlete journey
- [`docs/design/DESIGN_LANGUAGE.md`](docs/design/DESIGN_LANGUAGE.md) — visual and interaction law
- [`docs/design/DESIGN_SYSTEM_PROMPT.md`](docs/design/DESIGN_SYSTEM_PROMPT.md) — agent-facing design prompt (tokens, patterns, anti-patterns)
- [`docs/design/INFORMATION_ARCHITECTURE.md`](docs/design/INFORMATION_ARCHITECTURE.md) — required when changing navigation, page hierarchy, contextual Coach entry points, or athlete-facing information structure
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — code structure and conventions
- [`docs/domain/DOMAIN.md`](docs/domain/DOMAIN.md) — domain concepts and Digital Twin
- [`docs/EVENT_DRIVEN_ARCHITECTURE.md`](docs/EVENT_DRIVEN_ARCHITECTURE.md) — sync and orchestration (athlete-centric)
- [`docs/INSTANT_UX_ARCHITECTURE.md`](docs/INSTANT_UX_ARCHITECTURE.md) — optimistic UI, cache strategy, Instant / Background / Blocking
- [`docs/ATHLETE_SNAPSHOT.md`](docs/ATHLETE_SNAPSHOT.md) — canonical athlete state (Morning Experience)
- [`docs/SNAPSHOT_QUALITY_V1_AUDIT.md`](docs/SNAPSHOT_QUALITY_V1_AUDIT.md) — snapshot field audit & quality gate

## Agent skills (curated allowlist)

Skills live in [`.agents/skills/`](.agents/skills/). **Only the folders listed below are allowed.** Do not install taste/Expo/other-DB/Prisma-v7 packs without an explicit product decision. Prefer project docs above before any skill.

**Precedence:** `docs/design/*` + `PRODUCT.md` + `CORE_ARCHITECTURE.md` **win** over skill taste defaults. Skills refine execution; they do not redefine SHARPIT's visual or domain law.

### When to invoke

| Situation                                          | Skill(s)                                                 | How to use                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| UI / surface work inside the existing DS           | `impeccable`                                             | Read skill, then apply **only** within `DESIGN_LANGUAGE.md` / `DESIGN_SYSTEM_PROMPT.md` tokens and patterns. |
| Product craft / "is this SHARPIT-quality?"         | `hallmark`                                               | Use for judgment passes on athlete-facing flows, not greenfield restyles.                                    |
| Product / domain workshop (needs, model, strategy) | `layers-intro` → then the matching `layers-*`            | Start with intro; pick one layer per question (user-needs, domain, surface, …).                              |
| Motion / micro-interactions (web)                  | `animate`, then `motion-foundations` / `motion-patterns` | Web only. Never Expo/RN skills.                                                                              |
| Accessibility pass                                 | `accessibility`                                          | Before shipping interactive UI changes.                                                                      |
| Copy / microcopy tone                              | `better-writing`                                         | Athlete-facing strings; keep French UI as shipped.                                                           |
| UI anti-patterns audit                             | `anti-ui-slop`                                           | Audit only — do not invent a new aesthetic.                                                                  |
| Next.js / React performance patterns               | `vercel-react-best-practices`                            | Server Components, caching, waterfalls.                                                                      |
| New tests / red-green                              | `tdd`                                                    | Default for behaviour changes.                                                                               |
| Hard bug / regression                              | `diagnosing-bugs`                                        | Build a tight feedback loop before hypothesising.                                                            |
| PR / diff review                                   | `code-review`                                            | After implementation, before commit request.                                                                 |
| Domain model / Digital Twin language               | `domain-modeling`                                        | With `docs/domain/DOMAIN.md`; Core stays frozen.                                                             |
| Prisma migrate / generate / validate (Postgres v6) | `prisma-cli-*`, `prisma-database-setup-postgresql`       | Match the exact CLI skill to the command; stack is **PostgreSQL + Prisma 6**.                                |
| Agent docs / skill authoring                       | `writing-for-agents`                                     | When editing agent-facing markdown.                                                                          |
| Open research question                             | `research`                                               | Spikes, unknown APIs — not for Core invention.                                                               |
| Merge conflicts                                    | `resolving-merge-conflicts`                              | When git conflicted.                                                                                         |
| "Which skill fits?"                                | `find-skills` / `grill-me`                               | Router / clarification — prefer this table first.                                                            |

### Explicitly out of scope (do not re-add casually)

- Expo / React Native animation or mobile imagegen
- Industrial brutalist / Awwwards / Stitch / GSAP "taste" packs that fight `docs/design/*`
- Prisma setups for MongoDB, Cockroach, MySQL, SQLite, SQL Server
- Prisma **v7** upgrade skills while the repo is on Prisma 6
- Duplicate UI directors (`ui-design`, `design-taste-frontend*`, `gpt-taste`, …) — **`impeccable` + docs are canonical**
