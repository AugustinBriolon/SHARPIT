# SHARPIT — Documentation Migration Plan

> **Status:** Executed — July 2026  
> **Date:** July 2026  
> **Objective:** Reduce discoverability friction. A new engineer understands SHARPIT by reading **six canonical documents**. No knowledge is deleted.

---

## 1. Problem statement

SHARPIT has ~58 markdown files across `docs/`, `knowledge/`, and the repository root. Multiple documents describe the same concepts at different levels of authority:

| Concept               | Current locations (conflicting authority)                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Product purpose       | `MANIFESTO.md`, `PRODUCT_MANIFESTO_V2.md`, `PRODUCT_VISION.md`, `knowledge/product-constitution.md`            |
| Product principles    | `PRODUCT_PRINCIPLES.md`, manifestos, `PRODUCT_EXECUTION.md`                                                    |
| Athlete experience    | `ATHLETE_JOURNEY.md`, `USER_JOURNEYS.md`, `PRODUCT_EXPERIENCE_V2.md`                                           |
| Digital Twin          | `DIGITAL_TWIN.md`, `DOMAIN_CONCEPTS.md`, manifesto §4                                                          |
| System pipeline       | `SYSTEM_FLOW.md`, `DOMAIN_CONCEPTS.md`, `ARCHITECTURE.md`, `ENGINE_EXECUTION_GRAPH.md`                         |
| Inference / reasoning | `docs/models/*`, `knowledge/decision-engine.md`, `knowledge/recommendation-engine.md`, `knowledge/recovery.md` |
| Training load science | `SCIENCE.md`, `knowledge/training-load.md`, `docs/models/TRAINING_STRESS_MODEL.md`                             |
| ADRs                  | `knowledge/decisions/*` (not where README points: `docs/adr/`)                                                 |

A new engineer cannot tell which document wins when they disagree.

---

## 2. Target architecture

```
SHARPIT/
├── README.md                          ← Entry: setup + doc map (canonical #0)
├── ARCHITECTURE.md                    ← Engineering handbook (canonical #3)
├── AGENTS.md / CLAUDE.md              ← Thin pointers (unchanged role)
│
├── docs/
│   ├── product/
│   │   └── PRODUCT.md                 ← Constitution + execution + journey (canonical #1)
│   ├── domain/
│   │   └── DOMAIN.md                  ← Concepts + Twin + pipeline flow (canonical #4)
│   ├── models/
│   │   ├── README.md                  ← Model index + reading order (canonical #5)
│   │   ├── RECOVERY_MODEL.md          ← Per-model specs (canonical, unchanged names)
│   │   ├── FATIGUE_MODEL.md
│   │   ├── ADAPTATION_MODEL.md
│   │   ├── REASONING_ENGINE.md
│   │   └── TRAINING_STRESS_MODEL.md
│   ├── adr/
│   │   ├── README.md                  ← ADR index
│   │   ├── ADR-001-*.md               ← Moved from knowledge/decisions/
│   │   └── ...
│   ├── design/
│   │   └── DESIGN_LANGUAGE.md         ← Visual law (canonical #6)
│   ├── engineering/
│   │   └── INFERENCE_PLATFORM.md      ← Execution graph (supporting, deep dive)
│   ├── knowledge/
│   │   └── README.md                  ← Index into ../../knowledge/
│   ├── audits/
│   │   └── ...                        ← Point-in-time audits (historical)
│   └── archive/
│       └── ...                        ← Superseded full text + metadata
│
└── knowledge/                         ← Scientific reference corpus (supporting)
    ├── glossary.md
    ├── training-load.md
    ├── recovery.md                    ← Background science, not model spec
    └── ...
```

### The six canonical documents

Read in this order. Total: ~4–6 hours for a complete picture.

| #     | Document                         | Answers                                                  |
| ----- | -------------------------------- | -------------------------------------------------------- |
| **0** | `README.md`                      | What is SHARPIT, how do I run it, where is everything    |
| **1** | `docs/product/PRODUCT.md`        | Why we exist, how we build product, athlete moments      |
| **2** | `ARCHITECTURE.md`                | How code is organized, layers, conventions, review rules |
| **3** | `docs/domain/DOMAIN.md`          | What exists in the domain, Twin, pipeline, concepts      |
| **4** | `docs/models/README.md`          | Inference models — index and dependencies                |
| **5** | `docs/design/DESIGN_LANGUAGE.md` | How it must look and feel                                |

> **Note:** Numbering in README uses 0–5 for the six reads (README + 5 deep docs). `ARCHITECTURE.md` is canonical #2 in the reading path.

---

## 3. Full document audit (58 files)

### Legend

| Classification | Meaning                                                   |
| -------------- | --------------------------------------------------------- |
| **Canonical**  | Single source of truth — survives consolidation           |
| **Supporting** | Useful reference — indexed, not required for onboarding   |
| **Historical** | Point-in-time or superseded — archived with redirect stub |
| **Redundant**  | Content merged elsewhere — stub at old path               |
| **Obsolete**   | Pre-Kernel implementation docs — archived with warning    |

---

### Root

| File              | Classification          | Disposition                                                                                                     |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `README.md`       | Canonical               | Update doc map to six-document path; fix `docs/adr/` link                                                       |
| `ARCHITECTURE.md` | Canonical               | Trim duplicated pipeline prose; link to `DOMAIN.md` and `INFERENCE_PLATFORM.md`                                 |
| `AGENTS.md`       | Canonical               | Update paths after migration                                                                                    |
| `CLAUDE.md`       | Canonical               | Pointer only — no change                                                                                        |
| `SCIENCE.md`      | Supporting → Historical | French legacy index; superseded by `docs/models/` + `knowledge/`. Archive; stub points to `knowledge/README.md` |

---

### Product (`docs/`)

| File                       | Classification     | Disposition                                                                                                                                             |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCT_MANIFESTO_V2.md`  | Canonical → merged | **Becomes Part I** of `docs/product/PRODUCT.md`                                                                                                         |
| `PRODUCT_EXECUTION.md`     | Redundant          | **Becomes Part II** of `PRODUCT.md`                                                                                                                     |
| `ATHLETE_JOURNEY.md`       | Redundant          | **Becomes Part III** of `PRODUCT.md`                                                                                                                    |
| `MANIFESTO.md`             | Historical         | Archive v1; stub: "Superseded by `docs/product/PRODUCT.md` Part I"                                                                                      |
| `PRODUCT_VISION.md`        | Redundant          | Merge unique lines into PRODUCT Part I if any; else archive                                                                                             |
| `PRODUCT_PRINCIPLES.md`    | Redundant          | Content already in manifesto; archive                                                                                                                   |
| `USER_JOURNEYS.md`         | Supporting         | Move to `docs/archive/USER_JOURNEYS.md`; aspirational behavioral detail. Stub notes: canonical journey = PRODUCT Part III; aspirational depth = archive |
| `PRODUCT_EXPERIENCE_V2.md` | Supporting         | Move to `docs/archive/PRODUCT_EXPERIENCE_V2.md`; UI wireframes superseded by DESIGN_LANGUAGE + ATHLETE_JOURNEY. Stub with pointer                       |

**Merge rationale — Product trilogy → `PRODUCT.md`:**

| Overlap                                        | Why merge                                                                                                                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manifesto + Execution + Journey                | Same audience (product decisions), sequential logic (why → how we build → when athlete lives). Three files force engineers to discover the relationship.              |
| Manifesto + Vision + Principles + constitution | Five statements of mission/principles. V2 manifesto is authoritative per team decision.                                                                               |
| Journey + User Journeys                        | Journey = current state + friction + priority; User Journeys = aspirational screenplay. Keeping both as canonical duplicates "morning experience" across 1400+ lines. |

**`PRODUCT.md` structure:**

```
Part I — Constitution     (from PRODUCT_MANIFESTO_V2.md, unchanged text)
Part II — Execution       (from PRODUCT_EXECUTION.md)
Part III — Athlete Journey (from ATHLETE_JOURNEY.md)
Appendix A — Aspirational journeys (link to archive/USER_JOURNEYS.md)
Appendix B — Experience spec (link to archive/PRODUCT_EXPERIENCE_V2.md)
```

---

### Architecture & domain (`docs/`)

| File                               | Classification     | Disposition                                                                                                |
| ---------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `DOMAIN_CONCEPTS.md`               | Canonical → merged | **Core of `docs/domain/DOMAIN.md`**                                                                        |
| `DIGITAL_TWIN.md`                  | Redundant          | Merge Twin sections into DOMAIN.md (§ Digital Twin). ~70% overlap with DOMAIN_CONCEPTS Twin chapter        |
| `SYSTEM_FLOW.md`                   | Redundant          | Merge pipeline lifecycle into DOMAIN.md (§ System Flow). Explicitly derived from DOMAIN_CONCEPTS today     |
| `ENGINE_EXECUTION_GRAPH.md`        | Supporting         | Move to `docs/engineering/INFERENCE_PLATFORM.md`; canonical for execution platform details                 |
| `FEATURE_EXTRACTION.md`            | Supporting         | Move to `docs/engineering/FEATURE_EXTRACTION.md`; note at top: Feature Engine implemented — design history |
| `INFERENCE_ARCHITECTURE_REVIEW.md` | Historical         | Move to `docs/audits/INFERENCE_ARCHITECTURE_REVIEW_2026-07.md`                                             |
| `REPOSITORY_AUDIT.md`              | Historical         | Move to `docs/audits/REPOSITORY_AUDIT_2026-07-02.md`                                                       |
| `DATA_EXPOSURE_AUDIT.md`           | Historical         | Move to `docs/audits/DATA_EXPOSURE_AUDIT_2026-07-03.md`                                                    |

**Merge rationale — DOMAIN trilogy → `DOMAIN.md`:**

| Overlap                        | Canonical winner                | Sections moved                                                                                             |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| DOMAIN_CONCEPTS + DIGITAL_TWIN | DOMAIN.md                       | Twin philosophy, responsibilities, structure from DIGITAL_TWIN.md → DOMAIN §4 (dedupe with concepts layer) |
| DOMAIN_CONCEPTS + SYSTEM_FLOW  | DOMAIN.md                       | Pipeline lifecycle, event-driven philosophy from SYSTEM_FLOW → DOMAIN §2–3                                 |
| ARCHITECTURE + SYSTEM_FLOW     | ARCHITECTURE stays code-focused | Remove conceptual pipeline duplication from ARCHITECTURE; replace with link to DOMAIN §3                   |

**What stays out of DOMAIN.md:** Code conventions, folder rules, React patterns → remain in `ARCHITECTURE.md`.

---

### Models (`docs/models/`)

| File                                | Classification | Disposition                                                    |
| ----------------------------------- | -------------- | -------------------------------------------------------------- |
| `RECOVERY_MODEL.md`                 | Canonical      | Keep path; link from `models/README.md`                        |
| `FATIGUE_MODEL.md`                  | Canonical      | Keep                                                           |
| `ADAPTATION_MODEL.md`               | Canonical      | Keep                                                           |
| `REASONING_ENGINE.md`               | Canonical      | Keep                                                           |
| `TRAINING_STRESS_MODEL.md`          | Canonical      | Keep                                                           |
| `ADAPTATION_ARCHITECTURE_REVIEW.md` | Historical     | Move to `docs/audits/`; link from ADAPTATION_MODEL.md preamble |

**New file:** `docs/models/README.md` — dependency graph, reading order, mapping to `src/core/inference/`, link to INFERENCE_PLATFORM.md.

**Merge rationale:** No model spec merges — one model = one file is correct. Only the index was missing.

---

### Design (`docs/design/`)

| File                 | Classification | Disposition              |
| -------------------- | -------------- | ------------------------ |
| `DESIGN_LANGUAGE.md` | Canonical      | Keep path (canonical #6) |

---

### ADRs (`knowledge/decisions/` → `docs/adr/`)

| File                               | Classification | Disposition                                      |
| ---------------------------------- | -------------- | ------------------------------------------------ |
| `ADR-001-pmc-time-constants.md`    | Canonical      | Move to `docs/adr/ADR-001-pmc-time-constants.md` |
| `ADR-002-cross-sport-tss.md`       | Canonical      | Move to `docs/adr/`                              |
| `ADR-003-garmin-primary-source.md` | Canonical      | Move to `docs/adr/`                              |
| `ADR-004-signal-persistence.md`    | Canonical      | Move to `docs/adr/`                              |
| `ADR-template.md`                  | Supporting     | Move to `docs/adr/ADR-template.md`               |

**New file:** `docs/adr/README.md` — index, status, relationship to audits vs ADRs.

**Stub at `knowledge/decisions/`:** Each file becomes a one-line redirect to `docs/adr/`.

**Rationale:** README already references `docs/adr/` but ADRs live in `knowledge/decisions/`. One location for architectural decisions.

---

### Knowledge base (`knowledge/`)

| File                          | Classification | Disposition                                                                                         |
| ----------------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `product-constitution.md`     | Obsolete       | Archive — superseded by PRODUCT.md Part I                                                           |
| `decision-engine.md`          | Obsolete       | Archive — references pre-Kernel `buildTrainingVerdict()`; superseded by Reasoning Engine model spec |
| `recommendation-engine.md`    | Obsolete       | Archive — same                                                                                      |
| `recovery.md`                 | Supporting     | Keep — **background science** for Garmin/HRV signals; not the Recovery Model spec                   |
| `training-load.md`            | Supporting     | Keep — TSS/PMC/ACWR reference; model spec is TRAINING_STRESS_MODEL.md                               |
| `sleep.md`                    | Supporting     | Keep                                                                                                |
| `physiology.md`               | Supporting     | Keep                                                                                                |
| `strength-training.md`        | Supporting     | Keep                                                                                                |
| `injury-prevention.md`        | Supporting     | Keep                                                                                                |
| `hybrid-athlete.md`           | Supporting     | Keep                                                                                                |
| `triathlon.md`                | Supporting     | Keep                                                                                                |
| `nutrition.md`                | Supporting     | Keep                                                                                                |
| `wearables.md`                | Supporting     | Keep                                                                                                |
| `garmin.md`                   | Supporting     | Keep                                                                                                |
| `metrics.md`                  | Supporting     | Keep                                                                                                |
| `data-quality.md`             | Supporting     | Keep                                                                                                |
| `confidence-scoring.md`       | Supporting     | Keep                                                                                                |
| `scientific-methodology.md`   | Supporting     | Keep                                                                                                |
| `future-research.md`          | Supporting     | Keep                                                                                                |
| `glossary.md`                 | Supporting     | Keep — link from DOMAIN.md                                                                          |
| `architecture-links.md`       | Supporting     | Move to `docs/engineering/CODE_MAP.md` (rename for clarity)                                         |
| `references/recovery.md`      | Supporting     | Keep                                                                                                |
| `references/training-load.md` | Supporting     | Keep                                                                                                |
| `references/sleep.md`         | Supporting     | Keep                                                                                                |
| `research/paper-template.md`  | Supporting     | Keep                                                                                                |

**New file:** `knowledge/README.md` — categorized index (physiology, load, integrations, research), explicit rule:

> **Model behavior** → `docs/models/`. **Scientific background** → `knowledge/`. **Product law** → `docs/product/PRODUCT.md`.

**Obsolete rationale:** `decision-engine.md` and `recommendation-engine.md` describe the legacy dashboard assembly layer. The Kernel's Reasoning Engine and Decision Records supersede them. Content may contain useful conflict-resolution _ideas_ — extract to a footnote in REASONING_ENGINE.md if needed before archiving.

---

## 4. Redirect stub template

Every moved file leaves a stub at the **original path** (preserves git history, links, bookmarks):

```markdown
# Moved

This document has been consolidated.

**Canonical location:** [`path/to/new.md`](path/to/new.md)

**Archived full text:** [`docs/archive/original-name.md`](docs/archive/original-name.md)

_Migration: July 2026 documentation consolidation._
```

For `git mv` + stub: use `git mv` to archive or new location, then create stub at old path in a follow-up commit so history follows the content file.

---

## 5. Migration phases (execution order)

### Phase 0 — Preparation (no file moves)

- [ ] Review and approve this plan
- [ ] Add `docs/DOCUMENTATION_MAP.md` quick-reference table (optional one-pager)

### Phase 1 — Create targets (additive only)

- [ ] Create `docs/product/PRODUCT.md` by concatenating Manifesto V2 + Execution + Journey (with TOC)
- [ ] Create `docs/domain/DOMAIN.md` by merging DOMAIN_CONCEPTS + DIGITAL_TWIN + SYSTEM_FLOW (dedupe pass)
- [ ] Create `docs/models/README.md`
- [ ] Create `docs/adr/README.md` + move ADRs with `git mv`
- [ ] Create `knowledge/README.md`
- [ ] Create `docs/engineering/` and move INFERENCE_PLATFORM, FEATURE_EXTRACTION, CODE_MAP

### Phase 2 — Archive and stubs

- [ ] `git mv` superseded files to `docs/archive/`
- [ ] Write redirect stubs at all original paths
- [ ] Move audits to `docs/audits/`

### Phase 3 — Update entry points

- [ ] `README.md` — six-document reading path, fix adr link
- [ ] `ARCHITECTURE.md` — remove duplicated domain prose; link DOMAIN.md
- [ ] `AGENTS.md` — single product path (`docs/product/PRODUCT.md`)
- [ ] Cross-reference pass: grep for broken `docs/` and `knowledge/` links

### Phase 4 — Validation

- [ ] New engineer dry-run: can they answer "what is the Twin?" from one doc?
- [ ] Grep: no document claims "authoritative" status except the six canonical + per-model specs
- [ ] CI optional: link checker on markdown (future)

---

## 6. What can be deleted

**Nothing in Phase 1–3.**

After 90 days with stubs in place:

| Candidate        | Condition for deletion                     |
| ---------------- | ------------------------------------------ |
| Redirect stubs   | Only if zero inbound links and team agrees |
| `docs/archive/*` | **Never delete** per constraint            |

---

## 7. Concept → canonical document map (after migration)

| Concept                                                  | One canonical home                         |
| -------------------------------------------------------- | ------------------------------------------ |
| Mission, vision, philosophy, pillars                     | `docs/product/PRODUCT.md` Part I           |
| Product execution, seven questions                       | `docs/product/PRODUCT.md` Part II          |
| Athlete moments, friction, priority                      | `docs/product/PRODUCT.md` Part III         |
| Code structure, layers, conventions                      | `ARCHITECTURE.md`                          |
| Domain concepts, Twin, pipeline flow                     | `docs/domain/DOMAIN.md`                    |
| Recovery / Fatigue / Adaptation / Reasoning / TSS models | `docs/models/{MODEL}.md`                   |
| Model index and dependencies                             | `docs/models/README.md`                    |
| Inference execution platform                             | `docs/engineering/INFERENCE_PLATFORM.md`   |
| Architectural decisions                                  | `docs/adr/ADR-*.md`                        |
| Visual and emotional design                              | `docs/design/DESIGN_LANGUAGE.md`           |
| Scientific background, glossary                          | `knowledge/*.md` via `knowledge/README.md` |
| Code ↔ concept mapping                                   | `docs/engineering/CODE_MAP.md`             |
| Aspirational UX screenplay                               | `docs/archive/USER_JOURNEYS.md`            |
| Legacy UI wireframes                                     | `docs/archive/PRODUCT_EXPERIENCE_V2.md`    |

---

## 8. Risk register

| Risk                                       | Mitigation                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Broken external links to old paths         | Stubs at every old path indefinitely                                                                                                 |
| Merge conflicts in PRODUCT.md              | Keep parts as separate include files if git conflicts are painful (`product/manifesto.md` + build script) — prefer single file first |
| DOMAIN.md becomes too large (~2000 lines)  | Acceptable for canonical domain bible; split only if navigation fails                                                                |
| SCIENCE.md removal confuses French readers | Stub in French pointing to knowledge README                                                                                          |
| Agents cached old paths                    | Update AGENTS.md in same PR as stubs                                                                                                 |

---

## 9. Success criteria

- [ ] A new engineer reads ≤6 documents and can explain: Twin, pipeline, product philosophy, where models live
- [ ] Zero concepts with two "authoritative" documents
- [ ] `grep -r "Authoritative"` returns only canonical files + model specs
- [ ] No knowledge deleted — archive + stubs prove traceability

---

## 10. Approval gate

**Do not execute Phases 1–3 until this plan is approved.**

After approval, execute as a single documentation PR titled:

`docs: consolidate documentation architecture (no knowledge deleted)`

---

_Proposed July 2026. Supersedes informal documentation practices._
