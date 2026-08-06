# Design — Activité randonnée (`HIKE`) + bloc Nuitée

**Status:** approved direction (2026-08-06)  
**Phase:** Stabilization — express Digital Twin vertically; no new core engines  
**Scope V1:** type `HIKE`, métriques, import Garmin, page détail dédiée, bloc Nuitée  
**Scope V2 (différé):** dossier de déplacement liant plusieurs séances HIKE

---

## 1. Problem

Les activités Garmin de type hiking / walking / mountaineering tombent aujourd’hui en `ActivityType.OTHER` : pas de métriques persistées, pas de hero, skeleton sans carte, identité visuelle neutre. Une randonnée — surtout une nuitée ou une semaine en montagne — a une morphologie propre (durée longue, D+ dominant, lieu, météo, arrivée) que la page détail actuelle n’exprime pas.

L’athlète doit pouvoir :

1. **V1** — ouvrir une séance randonnée et lire les infos clés du parcours / de la nuitée.
2. **V2** — regrouper plusieurs séances HIKE d’un même déplacement dans un « dossier » qui compile les données et propose une analyse globale, **sans** perdre la page dédiée de chaque activité.

---

## 2. Goals & non-goals

### Goals (V1)

- Introduire `ActivityType.HIKE` + `HikeMetrics` alignés sur le pattern RUN/BIKE/SWIM.
- Mapper l’import Garmin hiking-like → `HIKE` avec métriques.
- Brancher `/training/[id]` pour `HIKE` : hero, carte, specs, bloc **Nuitée** / **Synthèse**.
- Laisser des extension points explicites pour un futur dossier de déplacement (V2).

### Non-goals (V1)

- Hébergement / refuge / API externe.
- Coach narrative HIKE, records, planning dédié, backfill massif des `OTHER` historiques.
- Nouveau moteur d’inférence ou modèle Core.
- UI complète du dossier déplacement (V2 seulement).

---

## 3. Architecture V1

### 3.1 Domain / schema

```
ActivityType += HIKE

HikeMetrics {
  activityId   @unique
  distanceM    Float?
  elevationM   Float?   // D+
  elevationLossM Float? // D− (optionnel ; stream si absent)
  avgHr        Int?
  calories     Int?
  avgSpeedMps  Float?
}
```

Champs activité déjà existants réutilisés (pas de duplication) :

- `duration`, `load`, `weather`, `notes`, `feeling`, `rpe`
- `observedLocationLabel` / `Lat` / `Lng`
- `stream` (carte, alts, FC, vitesse)

**Extension V2 (prévoir, ne pas implémenter) :** relation optionnelle activité → dossier.

```
// V2 — ne pas créer en V1 ; documenté pour éviter un couplage hostile
HikeTrip {
  id, title, startDate, endDate, notes?
  activities Activity[]  // via hikeTripId nullable sur Activity
}
```

En V1 : **ne pas** ajouter `hikeTripId` tant que le produit V2 n’est pas spécifié — mais :

- garder les métriques HIKE **additives** (distance, D+, durée, calories) pour agrégation future ;
- ne pas encoder « une activité = un déplacement » dans les noms de types / helpers ;
- exposer le bloc Nuitée via un **view model pur** `buildHikeOvernightSummary(activity, streamStats)` réutilisable plus tard par un agrégat multi-séances.

### 3.2 Import Garmin

Dans `mapGarminType` :

| Garmin type keys (exemples) | → |
|-----------------------------|---|
| `hiking`, `walking`, `mountaineering`, clés contenant `hike` (hors `trail_running`) | `HIKE` |

`trail_running` reste `RUN`.

Dans `buildGarminActivityData` / enrichissement : créer `hikeMetrics` (distance, elevationGain → `elevationM`, avg HR, calories, vitesse moy. si dispo).  
`elevationLoss` Garmin → `elevationLossM` si le champ existe sur le payload ; sinon null (stream peut compléter en UI).

Strava : hors scope V1 (hiking Strava déjà non importé aujourd’hui) — même règle, pas de régression.

### 3.3 Couches app

Respecter `ARCHITECTURE.md` :

```
page détail → helpers / view models purs → hooks streams → fetchers → API → queries
```

Fichiers touchés (indicatif) :

| Zone | Changement |
|------|------------|
| `prisma/schema.prisma` | enum + `HikeMetrics` |
| `garmin-activities.ts` | mapping + create metrics |
| `activity-include.ts` / queries | include `hikeMetrics` |
| `validators/activity.ts` | schéma create/update HIKE |
| `format.ts`, `sport-identity.ts` | label + chroma HIKE |
| `activity-hero-stats.tsx` | slots HIKE |
| `activity-detail-*` | branche HIKE, specs, skeleton map |
| `activity-detail-skeleton-layout.ts` | HIKE → `map` |
| nouveau helper pur | `buildHikeOvernightSummary` |
| nouveau composant | bloc Nuitée / Synthèse |
| travel / planned-session / records | switch exhaustifs : traiter `HIKE` (souvent comme mobilité / ignore records) |

Tout `Record<ActivityType, …>` et `switch (type)` doit rester exhaustif.

### 3.4 View model Nuitée (pur)

```ts
type HikeOvernightSummary = {
  variant: 'overnight' | 'day'; // libellé UI
  startAt: Date;
  endAt: Date;
  durationSec: number | null;
  locationLabel: string | null;
  weather: string | null;
  load: number | null;
  distanceM: number | null;
  elevationM: number | null;
  elevationLossM: number | null;
  endPoint: { lat: number; lng: number } | null; // dernier point path stream
  endLocationFallback: string | null;            // observedLocationLabel
};
```

Règle `variant` :

- `overnight` si la fenêtre `[date, date+duration]` traverse minuit **ou** `duration >= 8h` ;
- sinon `day` → libellé UI « Synthèse ».

Aucune I/O dans ce helper. Stream path optionnel en entrée.

### 3.5 UI détail (`/training/[id]`)

Ordre causal (design language) :

1. `MobileBackLink` + `ActivityDetailHeader` (label Randonnée)
2. `ActivityMetaRow`
3. Hero HIKE : **Distance · D+ · Durée · FC moy.** (vitesse / D− / calories en specs)
4. Bloc Nuitée / Synthèse (infos clés ci-dessus)
5. Goals si présents
6. `ActivityDetailInsights` (carte + profil altimétrique ; `expectMap: true`)
7. `ActivitySpecsNotes`

Identité sport : une famille chromatique **terre / ambre chaud** distincte de RUN orange et de Lime Pulse — une entrée dans `sport-identity.ts` (surface, text, border, hex, panel).

Pas de cartes décoratives ; le bloc Nuitée est une plaque instrument (`analysis-panel` / identité sport), labels `text-label`, valeurs `text-data` / body.

### 3.6 Exhaustivité & effets de bord

Mettre à jour tous les switches `ActivityType` pour compiler :

- planning load factors, travel disciplines, accessories, narrative eligibility (HIKE **non** éligible narrative V1), skeleton layout, list chips, manual create form si exposé.

Records : HIKE hors groupes PR V1 (comme OTHER).

---

## 4. V2 — Dossier de déplacement (extension points only)

**Intent :** lier N activités `HIKE` (ex. une semaine) → un dossier qui :

- conserve chaque page `/training/[id]` ;
- agrège distance, D+/D−, durée, charge, lieux, météo ;
- propose une analyse globale (produit / presentation — pas un nouveau moteur Core en première itération).

**Contrats à respecter dès V1 :**

1. Métriques HIKE additives et stables.
2. Summary builder paramétrable plus tard en `buildHikeTripSummary(activities[], streams[])`.
3. Pas de titre / copy UI qui affirme « ce déplacement » au niveau d’une seule séance (sauf variant overnight sur **cette** séance).
4. Quand V2 arrivera : `HikeTrip` + `activity.hikeTripId?` + route type `/training/trips/[id]` (nom exact à trancher) ; deep-link depuis chaque activité membre.

Hors de ce document de figer le schéma V2 au-delà du sketch §3.1.

---

## 5. Error / empty states

- Métrique absente → slot hero omis ou « — » selon pattern `ActivityHeroStats` existant (stream fallback pour FC / D+ / distance si besoin).
- Pas de stream → pas de carte ; bloc Nuitée sans `endPoint` (fallback lieu observé).
- Pas de lieu / météo → champs omis (pas de faux filler).
- Activité `OTHER` historique hiking : inchangée en V1.

---

## 6. Testing

- Unit : `mapGarminType` hiking → `HIKE` ; `trail_running` → `RUN`.
- Unit : `buildHikeOvernightSummary` — day vs overnight (minuit / ≥ 8h), endPoint depuis path.
- Unit / typecheck : exhaustivité `ActivityType` (TS + tests existants qui listent l’enum).
- Migration Prisma appliquable à vide.

Pas d’E2E obligatoire V1.

---

## 7. Rollout

1. Migration enum + table.
2. Mapping Garmin + métriques.
3. Identité / labels / validators / switches.
4. Hero + specs + skeleton map.
5. Bloc Nuitée + intégration page détail.
6. Tests ciblés.

---

## 8. Open questions (résolues)

| Question | Décision |
|----------|----------|
| Approche | Nouveau type `HIKE` (pas OTHER conditionnel, pas coerce RUN) |
| Contenu « nuit » | Synthèse parcours / nuitée (option B) |
| Dossier multi-séances | V2 ; extension points en V1 |
| Narrative coach | Pas en V1 |
| Backfill OTHER→HIKE | Pas en V1 |
