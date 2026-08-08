# Design — Dossier déplacement randonnée (`HikeTrip`)

**Status:** approved direction (2026-08-08)  
**Phase:** Stabilization — express Digital Twin vertically; no new core engines  
**Scope phase 1:** lier N activités `HIKE` → dossier compilé + Settings liste  
**Scope phase 2 (différé):** unifier la page Déplacements avec `AthleteTravelContext` (sortir le travel de la mémoire coach)

**Supersedes V2 sketch in:** [`2026-08-06-hike-activity-nuitee-design.md`](./2026-08-06-hike-activity-nuitee-design.md) §4

---

## 1. Problem

Une semaine en montagne (ou un week-end) produit plusieurs activités `HIKE` indépendantes. L’athlète veut les **lier** pour lire un déplacement comme un tout — durée globale, distance, D+/D−, charge — sans perdre chaque page `/training/[id]`.

Le triathlon n’est **pas** le bon modèle relationnel (1 activité parent + JSON jambes Garmin). Le pattern le plus proche est le **brick** (N entités + dossier), appliqué aux activités réalisées.

Aujourd’hui les « Déplacements » Settings vivent dans la **mémoire coach** (`AthleteTravelContext`) comme contrainte **future** ; les entrées expirées sont **purgées**. Ce n’est pas une surface d’historique ni un agrégat d’activités.

---

## 2. Goals & non-goals

### Goals (phase 1)

- Créer un dossier depuis la **liste Training** : multi-sélection d’activités `HIKE` → nommer → fiche compilée.
- Persister `HikeTrip` + `Activity.hikeTripId`.
- Fiche `/training/trips/[id]` : totaux + timeline des étapes ; ajouter / retirer des HIKE ; renommer ; supprimer le dossier (unlink, pas delete activités).
- Liste `/settings/trips` (point d’entrée Déplacements phase 1).
- Lien discret depuis une activité membre vers son déplacement.
- View-model pur `buildHikeTripSummary(activities[])` — zéro nouveau moteur Core.

### Non-goals (phase 1)

- Migration / soft-archive de `AthleteTravelContext` hors mémoire coach (phase 2).
- Suggestion auto de regroupement, lien auto travel ↔ hike trip.
- Narrative coach / analyse IA du déplacement.
- Carte multi-traces compilée.
- Multi-sélection hors `HIKE`.
- Backfill historique automatique.

---

## 3. Decisions (locked)

| Question        | Décision                                                                             |
| --------------- | ------------------------------------------------------------------------------------ |
| Création        | Liste Training, multi-select HIKE uniquement                                         |
| Habitat produit | Page Déplacements Settings (liste) ; fiche sous Training                             |
| Après création  | Dialog nom **obligatoire** → redirect fiche `/training/trips/[id]`                   |
| Édition membres | Ajouter **et** retirer depuis la fiche                                               |
| Modèle          | `HikeTrip` dédié (pas d’extension de `AthleteTravelContext`)                         |
| Phasage         | Phase 1 = dossiers HIKE ; phase 2 = unifier travel mémoire sur la même page Settings |
| Agrégats        | Calculés à la volée, non persistés                                                   |

---

## 4. Architecture phase 1

### 4.1 Data model

```
HikeTrip {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  activities Activity[]
}

Activity += hikeTripId String?
Activity.hikeTrip    HikeTrip?  @relation(..., onDelete: SetNull)
```

Règles :

- Seuls les `ActivityType.HIKE` peuvent être liés.
- Une activité ∈ 0 ou 1 trip.
- Création : **minimum 2** activités.
- Après retraits : 1 activité restante **autorisée** (CTA Ajouter mis en avant) ; 0 → empêcher le dernier retrait ou proposer supprimer le trip (implémentation : bloquer le retrait qui laisserait 0 membres ; supprimer le trip reste possible).
- `DELETE` trip : `hikeTripId → null` sur les membres, puis delete du trip. **Jamais** cascade delete des `Activity`.

### 4.2 Summary builder (pur)

`buildHikeTripSummary(activities: HikeTripMember[])` :

| Champ                           | Règle                                           |
| ------------------------------- | ----------------------------------------------- |
| `startAt` / `endAt`             | min `date` → max(`date` + duration)             |
| `durationSec`                   | somme des `duration` non null                   |
| `distanceM`                     | somme `hikeMetrics.distanceM`                   |
| `elevationM` / `elevationLossM` | sommes D+ / D−                                  |
| `load`                          | somme `load` non null                           |
| `locationLabels`                | labels observés distincts (ordre chronologique) |
| `memberCount`                   | N                                               |

Métrique absente → omise dans le hero (pattern `ActivityHeroStats`).

Étend le contrat V1 déjà noté dans `hike-overnight-summary.ts` (`buildHikeTripSummary`).

### 4.3 API

| Method   | Path                   | Body / notes                                                         | UX class           |
| -------- | ---------------------- | -------------------------------------------------------------------- | ------------------ |
| `POST`   | `/api/hike-trips`      | `{ name, activityIds[] }` — name non vide, ≥2 HIKE, aucune déjà liée | Blocking           |
| `GET`    | `/api/hike-trips`      | liste + summary court                                                | Background         |
| `GET`    | `/api/hike-trips/[id]` | détail + activités ordonnées par `date`                              | Background         |
| `PATCH`  | `/api/hike-trips/[id]` | `{ name? }` et/ou `{ addActivityIds?, removeActivityIds? }`          | SAFE_WITH_ROLLBACK |
| `DELETE` | `/api/hike-trips/[id]` | unlink + delete                                                      | SAFE_WITH_ROLLBACK |

Erreurs :

- Activité absente / non-HIKE → 400
- Déjà dans un autre trip → **409** message actionnable
- Nom vide → 400
- Retrait laissant 0 membres → 400

Auth / ownership : même garde que les autres routes activités (single-athlete app).

### 4.4 Client / Instant UX

- Création : attendre 201 → `router.push(/training/trips/[id])`.
- Rename / add / remove : optimistic sur le cache trip + invalidate liste Settings.
- Query keys : `hikeTrips`, `hikeTrip(id)` ; invalider aussi le détail activité membre si le chip lien dépend du fetch activité.

---

## 5. UX / UI

### 5.1 Routes

| Surface            | Route                                                    |
| ------------------ | -------------------------------------------------------- |
| Fiche compilée     | `/training/trips/[id]`                                   |
| Liste Déplacements | `/settings/trips`                                        |
| Création           | mode sélection dans liste Training (pas de route dédiée) |

### 5.2 Création (Training)

1. Entrée en mode sélection (filtre implicite : seules les lignes HIKE sont sélectionnables ; les autres restent visibles mais non cochables, ou masquées selon le pattern liste le plus simple — **préférer visibles non cochables** pour ne pas perdre le contexte calendaire).
2. Barre d’actions : « Créer un déplacement » active si ≥2 HIKE sélectionnées.
3. Dialog : champ **Nom** requis (placeholder ex. « Queyras · août ») → Confirmer.
4. Redirect fiche.

### 5.3 Fiche `/training/trips/[id]`

Composition instrument (pas un dashboard) :

1. `MobileBackLink` + header (nom, plage dates, menu : renommer, supprimer)
2. **Hero totaux** — une grille métriques : Durée · Distance · D+ · D− · Charge (slots omis si null)
3. **Timeline des étapes** — chronologique ; chaque ligne : date, titre, distance / D+ / durée, lien `/training/[id]`
4. Actions : Ajouter (picker HIKE sans trip) / Retirer (par étape)

Identité : chroma HIKE (ambre / terre) ; `text-label` / `text-data` ; plaques instrument — **pas de cartes décoratives**, pas de panneau « Synthèse » redondant par étape.

### 5.4 Activité membre

Lien discret dans le détail activité : « Voir le déplacement · {name} » → `/training/trips/[id]`. Pas de second panneau agrégé sur la page activité.

### 5.5 Settings `/settings/trips`

Liste : nom · plage dates · N étapes · totaux courts → ouvre la fiche Training.  
Empty state : « Aucun déplacement — lie des randonnées depuis Training. »  
Phase 1 : nouvelle entrée Settings home **Déplacements** → `/settings/trips` (Mémoire coach inchangée). Phase 2 déplacera les travels hors Mémoire vers cette entrée.

---

## 6. Phase 2 — contrat (non implémenté)

1. Surface Settings **Déplacements** unifie :
   - dossiers `HikeTrip` (rétrospectif sport) ;
   - contextes `AthleteTravelContext` (contrainte coaching, y compris historique).
2. Arrêter le hard-delete à expiration **ou** soft-archive — sans casser le prompt coach (toujours : en cours / à venir seulement dans le contexte LLM).
3. Ne **pas** fusionner les schémas : une entrée UI peut référencer l’un, l’autre, ou les deux plus tard via lien optionnel.
4. Fiche hike reste `/training/trips/[id]`.

---

## 7. Error / empty states

| Cas                               | Comportement                                    |
| --------------------------------- | ----------------------------------------------- |
| Métrique membre absente           | Omise de la somme / du slot hero                |
| Trip à 1 membre                   | Affiché ; CTA Ajouter prioritaire               |
| Conflit 409                       | Toast / inline : activité déjà dans « {autre} » |
| Trip introuvable                  | `notFound()`                                    |
| Picker vide (plus de HIKE libres) | Empty state dans le sheet Ajouter               |

---

## 8. Testing

- Unit : `buildHikeTripSummary` (sommes, fenêtre dates, labels).
- Unit : validators create/patch (min 2, HIKE only, name).
- API / integration : create, add, remove, 409, delete unlink.
- Component : hero + timeline via `renderToStaticMarkup`.
- Pas d’E2E obligatoire phase 1.

---

## 9. Rollout

1. Migration Prisma `HikeTrip` + `hikeTripId`.
2. Summary builder + tests.
3. API CRUD + règles de lien.
4. Fiche `/training/trips/[id]`.
5. Mode multi-select Training + dialog nom.
6. Chip lien sur détail activité HIKE.
7. Liste `/settings/trips` + entrée Settings.
8. Phase 2 (doc / ticket séparé) : migration travel mémoire.

---

## 10. Open questions (résolues)

| Question        | Décision                       |
| --------------- | ------------------------------ |
| Approche modèle | `HikeTrip` dédié               |
| Création        | Multi-select liste Training    |
| Nom             | Obligatoire à la création      |
| Post-create     | Fiche `/training/trips/[id]`   |
| Édition         | Add + remove                   |
| Liste           | `/settings/trips`              |
| Travel mémoire  | Phase 2, même surface Settings |
| Carte multi-GPS | Hors phase 1                   |
