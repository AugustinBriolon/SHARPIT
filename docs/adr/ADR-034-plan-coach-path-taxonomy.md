# ADR-034: Taxonomie des chemins Plan / Coach

**Status:** Accepted  
**Date:** 2026-09-11  
**Author:** Architecture P0 cleanup  
**Supersedes:** N/A

---

## Context

Plusieurs dossiers portent des stems `plan*` / `coach*` avec des intentions distinctes. Agents et humains confondent le hub Plan V1.1, le calendrier de séances, le générateur programme coach, et la route Twin `/plan/adaptation`. Sans définitions figées, chaque feature ajoute un cinquième dossier parallèle.

---

## Decision

Adopter les définitions suivantes comme **noms figés** (carte vivante : [`docs/architecture/INTENT_MAP.md`](../architecture/INTENT_MAP.md)). Les renames massifs sont hors scope ; les **nouveaux** fichiers doivent viser le path canonique.

### Plan cluster

| Nom actuel               | Intention                                            | Canonique cible (lecture)                          |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `components/plan/`       | Hub destination / semaine / trajectoire (Shell V1.1) | **plan-hub** (garder le dossier `plan/`)           |
| `components/planning/`   | UI calendrier séances, dialogs, scénarios            | **plan-week-ui** (garder `planning/`)              |
| `lib/planned-session/`   | Domaine données / prescriptions / linking séances    | **planned-session**                                |
| `lib/plan-gate/`         | Safety & coherence gate programme                    | **plan-gate**                                      |
| `lib/plan/`              | Orchestration hub Plan (non-gate)                    | **plan** (hub lib)                                 |
| `lib/planning/`          | Helpers UI jour (mince)                              | fusionner vers `plan/` ou `planned-session/` en P1 |
| `lib/coach/plan/`        | Générateur / adaptateur programme coach              | **coach-plan-gen** (path reste `coach/plan/`)      |
| Route `/plan/adaptation` | Lecture Twin Adaptation                              | **≠** `PlanAdapter` (`coach/adapt`)                |

### Coach cluster

| Nom actuel                 | Intention                                 | Canonique cible (lecture)                            |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `components/coach/`        | Chat + tools UI produit                   | **coach**                                            |
| `components/agents/`       | Kit primitives chat **montées** par coach | **coach-kit** (path reste `agents/` jusqu’à P2 slim) |
| `components/coaching/`     | Widgets partagés (ex. `coach-menu`)       | fusion P1 vers `plan` ou `planning`                  |
| `components/coach-memory/` | UI mémoire coach                          | **coach-memory**                                     |
| `lib/coach/`               | Chat, context, tools, plan gen            | **coach**                                            |
| `lib/coach-memory/`        | Persistance / lecture mémoire             | **coach-memory**                                     |
| `lib/decision-memory/`     | Aggregate décisions coaching (ADR-006)    | **decision-memory**                                  |
| `core/decision/`           | Engine décision Core gelé                 | **core-decision** — ne pas étendre                   |

### Briefing

| Nom                                    | Statut                                          |
| -------------------------------------- | ----------------------------------------------- |
| `lib/briefing/`, `/api/coach/briefing` | **Background / API only** — génération snapshot |
| UI `DailyBriefingPanel`                | **Supprimée** (démontée #94, purge P0)          |

---

## Rationale

- Stoppe l’éparpillement **futur** sans mega-move risqué.
- Aligné phase Stabilization : Core gelé, expression verticale.
- Une table Intention→path suffit pour agents ; ADR fige le vocabulaire reviewable.

## Alternatives Considered

### Mega-rename immédiat (`plan-hub/`, `coach-kit/`, …)

**Rejected because:** risque import massif + churn UI hors P0 ; levier compréhension déjà obtenu par docs + purge dead code.

### Tout fusionner sous `components/coach` et `components/plan`

**Rejected because:** mélange hub Shell, calendrier séances et kit chat ; localité verticale cassée.

## Consequences

### Positive

- Review bloquante si nouveau top-level `plan*` / `coach*` sans mise à jour INTENT_MAP + cet ADR.
- Agents cessent de chercher `calendar/` ou d’écrire dans le mauvais dossier.

### Negative

- Noms de dossiers historiques restent « laids » jusqu’à P1/P2.
- Charge mentale : lire la table une fois.

## Rollout

1. INTENT_MAP + ce ADR (P0, cette PR).
2. Purge dead `agents/` + UI briefing (P0).
3. Renames / fusions mécaniques en P1 uniquement avec re-exports.
