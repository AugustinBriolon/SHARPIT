# Intention athlete → path

> Carte vivante V1.1. Une intention athlete = un dossier canonique.  
> Handbook parent : [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §3.  
> Taxonomie Plan/Coach : [`ADR-034`](../adr/ADR-034-plan-coach-path-taxonomy.md).

Quand docs et code divergent, **fix le code** puis mets à jour cette carte dans la même PR.

---

## Surfaces produit

| Intention athlete                 | Routes                                | Components (canon)                                                                        | Lib (orchestration)                                                                                              | Notes                                                                                        |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Today / Twin du matin             | `/(app)/(home)`, `/today/*`           | `components/today/`                                                                       | `lib/today/`, `lib/presentation/today/`, `lib/morning-recalibration/`, `lib/athlete-state/`                      | Briefing = **API/background only** (`lib/briefing/`, `/api/coach/briefing`) — pas d’UI Today |
| Plan (hub destination / semaine)  | `/plan`, `/plan/*`                    | `components/plan/`                                                                        | `lib/plan/`, `lib/plan-gate/`                                                                                    | Hub V1.1 Shell — pas le générateur coach                                                     |
| Séances planifiées / calendrier   | (via Plan + dialogs)                  | `components/planning/`                                                                    | `lib/planned-session/` ; day-selection = `lib/plan/` (re-export `lib/planning/`)                                 | UI semaine/séances ; données = `planned-session`                                             |
| Génération / adaptation programme | tools coach                           | `components/coach/` (tools UI)                                                            | `lib/coach/plan/`                                                                                                | ≠ route `/plan/adaptation` (Twin)                                                            |
| Coach conversationnel             | `/coach`                              | `components/coach/` (+ kit `components/coach/kit/`)                                       | `lib/coach/`, `lib/coach-memory/`, `lib/decision-memory/`                                                        | Kit = primitives chat ; `components/agents/` **supprimé** (P3)                               |
| Activité                          | `/activite/*`                         | `components/training/`                                                                    | `lib/activity/`, `lib/training/` (nest `pmc/`, `records/`, `load/`, `periodization/`, `thread/`), `lib/streams/` | Re-exports plats `lib/training/<file>` temporaires                                           |
| Journal / habitudes               | `/journal/*`                          | `components/journal/`                                                                     | `lib/journal/` (canon) ; re-exports temporaires `lib/health/<journal-*>`                                         | Body / activity-status restent dans `lib/health/`                                            |
| Moi / profil                      | `/moi/*`                              | `components/shell/moi-*`, `components/profile/`, `components/corps/`, `components/goals/` | `lib/moi/`, `lib/profile/`, `lib/preferences/`                                                                   | Hub contenu sous `shell/`                                                                    |
| Settings                          | `/settings/*`                         | `components/settings/`                                                                    | `lib/settings/`                                                                                                  |                                                                                              |
| Physio drill-downs                | `/today/sleep`, `/plan/adaptation`, … | `components/{sleep,recovery,effort,adaptation,nutrition,physical-health}/`                | miroirs + `lib/presentation/<surface>/` (nest P1)                                                                | `/plan/adaptation` = lecture Twin Adaptation ≠ `PlanAdapter`                                 |

## Chrome & kit

| Rôle                                             | Path                                              | Ne confondre pas avec                                          |
| ------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------- |
| Chrome structurel (AppShell, BottomNav)          | `components/layout/`                              | **seul** mot pour le chrome structurel                         |
| Hubs de contenu des tabs (Plan / Moi / Activité) | `components/shell/`                               | `layout/` — **rester `shell/`** (pas de rename `hubs/`)        |
| Glass / overlays légers                          | `components/chrome/`                              |                                                                |
| Kit chat coach (reachable only)                  | `components/coach/kit/`                           | Ne pas réintroduire `agents/`, sidebar / image-gen / file-diff |
| Menu coaching partagé                            | `components/planning/coach-menu.tsx`              | Fusionné depuis `coaching/` (P1)                               |
| Visuel exercice (séance / activité)              | `components/planning/session/exercise-visual.tsx` | Fusionné depuis `sessions/` (P1)                               |

## Couches data (noms proches)

| Intention                     | Path                              | Rôle                                                                                              |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Cache client TanStack         | `lib/query/`                      | keys, fetchers, optimistic — **ne pas confondre** avec `queries/`                                 |
| Helpers Prisma serveur        | `lib/queries/`                    | server-only — alias transition `lib/db-queries` (re-export) ; rename massif call sites hors scope |
| `cn()` UI                     | `lib/utils.ts`                    |                                                                                                   |
| Helpers purs (`isSet`, …)     | `lib/util/`                       | Core peut importer                                                                                |
| ViewModels I/O-aware          | `lib/presentation/<surface>/`     | nest par surface UI ; re-exports plats temporaires                                                |
| Types / VM purs Twin          | `core/presentation/`              | Core gelé                                                                                         |
| Journal orchestration         | `lib/journal/`                    | day-journal, habits, wellness — **≠** `lib/health/` (body/status)                                 |
| Health / composition          | `lib/health/`                     | activity-status, body-composition, health-status                                                  |
| Coach AI config / usage       | `lib/ai/`                         | re-exports plats `lib/ai-usage`                                                                   |
| Conversations / weekly review | `lib/coach/`                      | re-exports plats `lib/conversations`, `lib/weekly-review`                                         |
| Planning day selection        | `lib/plan/planning-day-selection` | re-export `lib/planning/*` (fusion P2)                                                            |
| Physical / corps helpers      | `lib/physical-health/`            | `physical` (+ re-export plat `lib/physical`) ; ≠ `components/physical-health/`                    |
| Observation sync manuel       | `lib/observation/`                | `manual-observation-sync` (+ re-export plat) ; ≠ `core/observation/` (engine gelé)                |

## Règles anti-éparpillement

1. **Pas de nouveau top-level** dont le stem est un préfixe d’un existant saturé (`plan*`, `coach*`) sans ADR.
2. Alias historiques = re-export temporaire, pas nouveaux fichiers.
3. Toute PR qui crée/supprime un dossier top-level sous `src/components` ou `src/lib` met à jour cette carte + `ARCHITECTURE.md` §3.
4. Code UI non monté par une route athlete → delete (pas de kit « au cas où »).
5. **`docs/archive/` et `docs/audits/` ne sont pas la loi** — constitution = PRODUCT / DESIGN_* / CORE_ARCHITECTURE / ce fichier. AGENTS.md le dit déjà.
6. **Guards** : `lib` n’importe pas `@/components` ni `@/core/inference` hors `engines/` sauf allowlist **file → specifier** pinnée (`lib-boundary-guard.test.ts`, y compris `vi.mock` / `vi.doMock`). Grandfather actuel (ne pas croître sans note ici / ADR) :
   - **→ components** : demo (2), activity detail/display, strength-prescription test, withings-ecg-display, composition-metric-guides, coach-chat-known-sessions, query/optimistic(+test), planned-session-metrics
   - **→ inference** : projection (2), planned-session/resolve-context, streams/neuromuscular, sleep-scoring(+test), presentation/environment(+test), presentation/physical-health, scenario/compare, today-state-server
