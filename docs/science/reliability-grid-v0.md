# Science Sport — Grille fiabilité V0

> **Statut :** canonique produit Science Sport (V0)  
> **Design associé :** [`docs/design/confidence-brief-v0.md`](../design/confidence-brief-v0.md)  
> **Non-négociable :** le LLM n’est **jamais** source de vérité pour les verdicts. Les moteurs déterministes seuls décident ; le LLM peut seulement reformuler.

---

## 1. Principes

1. **Moteurs déterministes = seule source de vérité.** L’UI / le Coach LLM phrasent uniquement.
2. **Préférer soft-hero / `INSUFFICIENT_DATA` à une fausse certitude.**
3. **Wellness uniquement :** `illnessRisk` = signal de récupération atypique, **pas** un diagnostic.
4. **Verdicts durs** (`TRAIN_HARD` / `RACE_READY` / `TRAIN_SMART` assertif) exigent un pack **FULL**.
5. Pack incomplet ou périmé → soft-hero. Moins de 2 dimensions de récupération **ou** baseline HRV &lt; 7 j → `INSUFFICIENT` (pas d’`topAction` d’intensité).
6. Tiers machine : `FULL` | `PARTIAL` | `LOW` | `INSUFFICIENT`.
7. Soft-hero Design : « Estimation partielle » + gaps visibles ; jamais « taper fort » sans hedge.
8. **Provenance obligatoire :** séries, timestamps, gaps, poids objectif vs journal, `rationaleCodes`.
9. Journal morning wellness (humeur / énergie / courbatures / stress) = **seul** subjectif pondéré en Recovery v1. Le reste → « Noté, pas encore pondéré » sauf effets documentés.
10. Recalc A/B : snapshot inputs + verdict déterministe (+ codes) ; échec B → rollback A.
11. Plan gate : sous `RECOVER` / `CAUTION`, retenir `TEMPO` + `THRESHOLD` + `VO2MAX` + `RACE`.
12. **Hors V0 :** pondération journal étendue, calibration individuelle, glycogène, diagnostic maladie / OTS.

---

## 2. Pack FULL — critères

| Signal | Règle fraîcheur / couverture |
| ------ | ---------------------------- |
| Sommeil nuit J | Âge ≤ **18 h** |
| HRV matin | Âge ≤ **12 h** |
| Baseline HRV | ≥ **14 jours** |
| Charge 7 j | Sync ≤ **48 h** et ≥ **5/7** jours de couverture |
| Contexte sport | Requis si conseil d’intensité |

Tous les critères ci-dessus doivent être vrais pour `packTier = FULL`.

---

## 3. Tiers machine

| Tier | Condition (résumé) | Effet produit |
| ---- | ------------------ | ------------- |
| `FULL` | Pack complet (table §2) | Hero actuel, verdicts durs autorisés |
| `PARTIAL` | ≥2 dimensions, baseline ≥7 j, pack incomplet / partiellement périmé | Soft-hero + chip Estimation partielle + gaps |
| `LOW` | Couverture mince mais pas `INSUFFICIENT` | Soft-hero plus prudent |
| `INSUFFICIENT` | &lt;2 dimensions récupération **ou** baseline &lt;7 j | Pas d’intensité en `topAction` ; CTA sources / sync |

Mapping proche (non identique) de `DataCompleteness` (`FULL|PARTIAL|SPARSE|INSUFFICIENT`) : `LOW` ≈ `SPARSE`.

---

## 4. Soft-hero & provenance

- Titre hedged + chip **Estimation partielle** + gaps visibles.
- Jamais « taper fort » / race-ready sans `FULL`.
- Collapsible **Pourquoi** sous le hero : séries, âge des données, gaps, poids journal vs objectif, `rationaleCodes` lisibles FR.
- `illnessRisk` → chip « récupération atypique » uniquement.

---

## 5. Recalc A/B (evidence)

1. Avant recalc : persister snapshot A (inputs + verdict déterministe + codes), isolé athlète.
2. Calculer B.
3. Si B échoue → rollback A + toast.
4. Si B OK → optionnel « Voir ce qui a changé » (diff court A/B).

**Rétention (placeholder, Privacy TBD pour verrou TTL) :**

- garder les **5** dernières analyses **ou** **14 jours** max (le premier atteint) ;
- purge au soft-delete / retrait consentement santé (aligné soft-delete 30 j existant).

---

## 6. Plan gate

Sous `RECOVER` / `CAUTION`, intensités retenues :

`TEMPO` · `THRESHOLD` · `VO2MAX` · `RACE`

Le soft intensity-gate Plan (#83) couvrait déjà `TEMPO`. Le chemin legacy `plan-gate` `HIGH_INTENSITY` doit l’inclure aussi.

---

## 7. Implémentation code

| Pièce | Emplacement |
| ----- | ----------- |
| `computePackTier` | `src/core/science/pack-tier.ts` |
| Provenance FR | `src/lib/science/reliability/provenance.ts` |
| Soft-hero overlay | `src/lib/science/reliability/soft-hero.ts` |
| Evidence A/B | `src/lib/science/reliability/analysis-evidence.ts` (+ store Prisma) |
| Plan-gate TEMPO | `src/lib/plan-gate/rules/*` via `HARD_SESSION_INTENSITIES` |
| Today hero | `TodayViewModel.hero.reliability` + `TodayVerdictHero` |
| Journal badges | `src/lib/journal/reliability-weighting.ts` |

---

## 8. Hors scope V0

Pondération journal étendue, calibration individuelle, glycogène, diagnostic maladie / OTS.
