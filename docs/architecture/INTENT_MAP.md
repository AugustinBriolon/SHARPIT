# Intention athlete → path

> Carte vivante V1.1. Une intention athlete = un dossier canonique.  
> Handbook parent : [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §3.  
> Taxonomie Plan/Coach : [`ADR-034`](../adr/ADR-034-plan-coach-path-taxonomy.md).

Quand docs et code divergent, **fix le code** puis mets à jour cette carte dans la même PR.

---

## Surfaces produit

| Intention athlete                 | Routes                                | Components (canon)                                                                        | Lib (orchestration)                                                                         | Notes                                                                                        |
| --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Today / Twin du matin             | `/(app)/(home)`, `/today/*`           | `components/today/`                                                                       | `lib/today/`, `lib/presentation/today*`, `lib/morning-recalibration/`, `lib/athlete-state/` | Briefing = **API/background only** (`lib/briefing/`, `/api/coach/briefing`) — pas d’UI Today |
| Plan (hub destination / semaine)  | `/plan`, `/plan/*`                    | `components/plan/`                                                                        | `lib/plan/`, `lib/plan-gate/`                                                               | Hub V1.1 Shell — pas le générateur coach                                                     |
| Séances planifiées / calendrier   | (via Plan + dialogs)                  | `components/planning/`                                                                    | `lib/planned-session/`, `lib/planning/` (mince)                                             | UI semaine/séances ; données = `planned-session`                                             |
| Génération / adaptation programme | tools coach                           | `components/coach/` (tools UI)                                                            | `lib/coach/plan/`                                                                           | ≠ route `/plan/adaptation` (Twin)                                                            |
| Coach conversationnel             | `/coach`                              | `components/coach/` (+ kit slim `components/agents/`)                                     | `lib/coach/`, `lib/coach-memory/`, `lib/decision-memory/`                                   | `agents/` = primitives chat montées par coach seulement                                      |
| Activité                          | `/activite/*`                         | `components/training/`                                                                    | `lib/activity/`, `lib/training/`, `lib/streams/`                                            |                                                                                              |
| Journal / habitudes               | `/journal/*`                          | `components/journal/`                                                                     | surtout `lib/health/` (journal\* — rename P1)                                               | Lib mal nommée ; UI = `journal/`                                                             |
| Moi / profil                      | `/moi/*`                              | `components/shell/moi-*`, `components/profile/`, `components/corps/`, `components/goals/` | `lib/moi/`, `lib/profile/`, `lib/preferences/`                                              | Hub contenu sous `shell/`                                                                    |
| Settings                          | `/settings/*`                         | `components/settings/`                                                                    | `lib/settings/`                                                                             |                                                                                              |
| Physio drill-downs                | `/today/sleep`, `/plan/adaptation`, … | `components/{sleep,recovery,effort,adaptation,nutrition,physical-health}/`                | miroirs + `lib/presentation/*`                                                              | `/plan/adaptation` = lecture Twin Adaptation ≠ `PlanAdapter`                                 |

## Chrome & kit

| Rôle                                             | Path                                 | Ne confondre pas avec                               |
| ------------------------------------------------ | ------------------------------------ | --------------------------------------------------- |
| Chrome structurel (AppShell, BottomNav)          | `components/layout/`                 |                                                     |
| Hubs de contenu des tabs (Plan / Moi / Activité) | `components/shell/`                  | `layout/`                                           |
| Glass / overlays légers                          | `components/chrome/`                 |                                                     |
| Kit chat coach (reachable only)                  | `components/agents/`                 | Ne pas réintroduire sidebar / image-gen / file-diff |
| Menu coaching partagé                            | `components/coaching/coach-menu.tsx` | Micro-dossier ; fusion P1 possible                  |

## Couches data (noms proches)

| Intention                 | Path                 | Rôle                       |
| ------------------------- | -------------------- | -------------------------- |
| Cache client TanStack     | `lib/query/`         | keys, fetchers, optimistic |
| Helpers Prisma serveur    | `lib/queries/`       | server-only                |
| `cn()` UI                 | `lib/utils.ts`       |                            |
| Helpers purs (`isSet`, …) | `lib/util/`          | Core peut importer         |
| ViewModels I/O-aware      | `lib/presentation/`  |                            |
| Types / VM purs Twin      | `core/presentation/` | Core gelé                  |

## Règles anti-éparpillement

1. **Pas de nouveau top-level** dont le stem est un préfixe d’un existant saturé (`plan*`, `coach*`) sans ADR.
2. Alias historiques = re-export temporaire, pas nouveaux fichiers.
3. Toute PR qui crée/supprime un dossier top-level sous `src/components` ou `src/lib` met à jour cette carte + `ARCHITECTURE.md` §3.
4. Code UI non monté par une route athlete → delete (pas de kit « au cas où »).
