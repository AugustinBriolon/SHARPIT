# Sharpit — Grille de fiabilité Science Sport V0

> **Statut :** Spec produit / science — implémentable par Design, Eng, Privacy  
> **Design associé :** [`docs/design/confidence-brief-v0.md`](../design/confidence-brief-v0.md)  
> **Périmètre :** triathlon endurance (natation / vélo / course) — coaching wellness  
> **Repo de référence :** `AugustinBriolon/SHARPIT` (lecture seule)  
> **Ancrages :** `docs/models/RECOVERY_MODEL.md`, `docs/models/DECISION_ENGINE.md`, `docs/models/PHYSICAL_HEALTH_ENGINE.md`, `PRODUCT.md` / `docs/product/PRODUCT.md`, `docs/ATHLETE_SNAPSHOT.md`, `docs/adr/ADR-005-plan-safety-gate-placement.md`, `src/lib/plan-gate/rules/decision-compatibility.ts`, `src/lib/journal/day-context-factors.ts`, `src/lib/validators/wellness-checkin.ts`  
> **Date :** 2026-09-15 · **Owner :** Science Sport (avec Design / Eng / Privacy)

---

## Positionnement (non négociable)

Sharpit est un **outil d’aide à l’entraînement** (wellness coaching).  
Ce n’est **pas** un dispositif médical. Les sorties des moteurs sont des **estimations d’entraînement**, jamais un diagnostic, une prescription clinique, ni une certitude médicale.

Alignement Privacy V0 : le signal `illnessRisk` = **signal de récupération atypique** (pattern physiologique compatible avec une activation immunitaire / fatigue non expliquée par la charge), **pas** une détection de maladie.

---

## 1. Principes

| #   | Principe                                                    | Règle opérationnelle                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Moteurs déterministes = source de vérité**                | Recovery / Fatigue / Adaptation / Physical Health / Decision / Plan-gate produisent l’état et les verdicts. Le LLM **phrase**, **propose**, **explique** — il **ne décide jamais** et ne peut pas inventer un score, un verdict, ou un frein. |
| P2  | **Préférer INSUFFICIENT / soft-hero à la fausse certitude** | Un verdict « fort » (`TRAIN_HARD`, `RACE_READY`, `TRAIN_SMART` assertif) exige un pack d’évidence minimal (§2). Sinon → soft-hero ou `INSUFFICIENT_DATA`.                                                                                     |
| P3  | **Wellness only, pas de diagnostic**                        | Copy athlète : « estimation », « signal », « pattern ». Interdit : « tu es malade », « diagnostic », « ordonnance », certitude clinique. `illnessRisk` → wording « récupération atypique / signal à surveiller ».                             |
| P4  | **Confiance ≠ score**                                       | Un readiness 70 à confiance LOW n’est **pas** plus actionnable qu’un readiness 40 à confiance HIGH. La confiance gate le niveau d’assertivité du hero.                                                                                        |
| P5  | **Une seule arbitration**                                   | Produit lit `DecisionState` / Athlete Snapshot. Aucune surface UI ne recombine Recovery+Fatigue+… en silence.                                                                                                                                 |
| P6  | **Seuls les effets documentés bougent l’analyse**           | Journal / wellness : si le champ n’a pas d’effet modèle documenté (§5), l’athlète voit « noté, pas encore pondéré ». Pas de pondération occultée.                                                                                             |
| P7  | **Fail closed sur le recalcul**                             | Recalcul A/B : si B échoue → rollback A (§6). Jamais d’état « demi-calculé » exposé comme vérité.                                                                                                                                             |

---

## 2. Pack d’évidence critique — verdict « hard »

### 2.1 Verdicts concernés (assertifs)

Un **verdict hard** = présentation assertive du hero + `topAction` non nul, pour :

- `TRAIN_HARD`
- `RACE_READY`
- `TRAIN_SMART` **fort** (copy assertive, sans hedge « estimation partielle »)

Les verdicts `TRAIN_EASY`, `CAUTION`, `RECOVER` peuvent s’afficher avec un pack **partiel** (biais conservateur), mais restent soumis aux règles soft-hero si la confiance est LOW / INSUFFICIENT.

`INSUFFICIENT_DATA` : jamais de recommandation d’intensité précise (`topAction = null` — aligné Decision Engine).

### 2.2 Pack minimum « FULL » (hard autorisé)

Pour autoriser un verdict hard, **toutes** les lignes ci-dessous doivent être satisfaites (flags machine §3).

| Domaine                                    | Signal minimum                                                                                                    | Fraîcheur                                                                                                      | Ancrage pratique                                                              | Hypothèses (à valider Science Sport)                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Sommeil**                                | Observation SLEEP pour la nuit se terminant le matin du `trainingDayId` (durée ± architecture si dispo)           | **≤ 18 h** après le réveil estimé / dispo le jour J                                                            | Une nuit manquante = dette de récupération non observée (Walker / Van Dongen) | H1 : fenêtre 18 h = « matin + fin de matinée » ; après ~18 h sans sleep J → stale                                    |
| **HRV / marqueur récup**                   | `hrvDeltaFromBaseline` **ou** (fallback documenté) RHR delta si HRV PENDING — mais pour **hard**, HRV **préféré** | Mesure du **matin J** (ou fenêtre overnight Garmin du jour), **≤ 12 h** après wake                             | HRV matinale = signal ANS le plus sensible (Buchheit / Plews)                 | H2 : optical HRV OK avec `measurementQuality` ≤ 0.70 ; pas de hard si contamination post-effort                      |
| **Baseline ANS**                           | ≥ **14 jours** d’historique HRV utilisable (maturité ≥ 0.80)                                                      | Baseline rolling 14 j                                                                                          | Aligné Recovery Model v1                                                      | H3 : jours 7–13 → hard **interdit** (PARTIAL max) ; jours 1–6 → `INSUFFICIENT` / `BASELINE_PENDING`                  |
| **Charge récente**                         | `load.acuteLoad` (TSS **7 j**) + `acwr` calculable                                                                | Sessions sync **≤ 48 h** ; fenêtre 7 j complète à ≥ **5/7** jours avec donnée (incl. 0 TSS = jour repos connu) | Charge aiguë module l’interprétation de la récup                              | H4 : < 5 jours de couverture 7 j → PARTIAL ; pas de chronic (42 j) → ACWR fragile → pas de hard                      |
| **Contexte sport** (si intensité proposée) | Séance planifiée du jour **ou** intention claire (sport + `SessionIntensity`)                                     | Plan du jour J non obsolète (modifié ≤ 24 h ou inchangé mais cohérent Decision)                                | Sans sport/intensité, un `TRAIN_HARD` est ambigu (natation ≠ piste VO2)       | H5 : hard sans séance planifiée → soft-hero « prêt pour une charge élevée » **sans** nommer TEMPO/THRESHOLD/VO2/RACE |

**Règle composite (Recovery) :** ≥ **2 dimensions** recovery disponibles (Autonomic / Sleep / Subjective / Load). Moins de 2 → `readinessCategory = INSUFFICIENT_DATA` (spec Recovery) — **hard interdit**.

### 2.3 Mapping pack → UI

| État du pack                                                                            | Verdict hard ? | Sortie produit                                                                                                             |
| --------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pack FULL + `confidenceTier` HIGH (≥ 0.75) + `dataCompleteness` FULL                    | Oui            | Hero assertif (`TRAIN_HARD` / `RACE_READY` / `TRAIN_SMART` fort)                                                           |
| Pack PARTIAL (1–2 domaines manquants ou frais OK mais baseline 7–13 j)                  | Non            | **Soft-hero** (§3) — verdict possible `TRAIN_SMART` / `TRAIN_EASY` **hedgé**, jamais `TRAIN_HARD` / `RACE_READY` assertifs |
| Pack LOW (HRV **et** sleep manquants, ou confiance < 0.40)                              | Non            | Soft-hero minimal **ou** `INSUFFICIENT_DATA`                                                                               |
| Pack INSUFFICIENT (< 2 dimensions recovery, baseline < 7 j, ou Decision `INSUFFICIENT`) | Non            | **`INSUFFICIENT_DATA`** — pas de `topAction` intensité ; CTA = compléter données / sync                                    |

### 2.4 Seuils de fraîcheur — résumé Eng

```
SLEEP_FRESH_MAX_HOURS_AFTER_WAKE = 18   // H1
HRV_FRESH_MAX_HOURS_AFTER_WAKE   = 12   // H2
LOAD_SYNC_MAX_AGE_HOURS          = 48   // H4
HRV_BASELINE_DAYS_HARD           = 14   // H3
HRV_BASELINE_DAYS_PARTIAL        = 7
LOAD_7D_MIN_COVERED_DAYS         = 5    // H4
```

Flags dérivés recommandés (exposé Snapshot / Decision) :

- `evidence.sleepFresh` / `evidence.hrvFresh` / `evidence.loadFresh`
- `evidence.baselineMaturity`: `NONE | PARTIAL | ADEQUATE | MATURE`
- `evidence.packTier`: `FULL | PARTIAL | LOW | INSUFFICIENT` (§3)

---

## 3. Soft-hero / règles d’incertitude

### 3.1 Quand soft-hero (obligatoire)

Soft-hero dès que **l’une** des conditions est vraie :

1. `evidence.packTier` ∈ { `PARTIAL`, `LOW` }
2. `confidenceTier` ∈ { `MEDIUM`, `LOW` } **et** verdict cible serait hard
3. Dissonance subjective/objective détectée (`dissonanceDetected`)
4. Domaine sleep ou HRV `stale` / `missing` le matin
5. Baseline HRV < 14 j

Soft-hero **interdit** de :

- Affirmer « tu peux taper fort » / « race ready » sans hedge
- Masquer les sources manquantes
- Laisser le LLM « combler » les trous

### 3.2 Ce que Design doit montrer (estimation partielle)

| Élément            | Soft-hero                                                     | Hard hero                                      |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| Eyebrow            | « Estimation partielle » / « Données incomplètes »            | « Que faire aujourd’hui ? » (phase matin)      |
| Headline           | Verdict **hedgé** (« Orientation : charge maîtrisée »)        | Verdict assertif mappé (`mapVerdictToDisplay`) |
| Sous-ligne         | Liste courte des manques (« Sommeil nuit J pas encore sync ») | Frein / facteur limitant principal             |
| Pastille confiance | Visible (PARTIAL / LOW)                                       | Visible (FULL / HIGH) option expert            |
| CTA                | Sync / check-in wellness / patienter                          | Action séance / rearrange                      |

Copy type (FR) :

> **Estimation partielle.** On s’appuie sur [sources présentes]. Il manque : [sources absentes]. Orientation prudente — pas une validation haute intensité.

### 3.3 Paliers de confiance — flags machine (Eng)

Alignement avec l’existant + grille V0 :

| Flag produit V0  | Mapping code existant                                                                                | Effet UI                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **FULL**         | `dataCompleteness = FULL` **et** `confidenceTier = HIGH` **et** pack FULL                            | Hero assertif autorisé                               |
| **PARTIAL**      | `PARTIAL` / `SPARSE` **ou** `confidenceTier = MEDIUM` **ou** pack PARTIAL                            | Soft-hero ; pas de TRAIN_HARD / RACE_READY assertifs |
| **LOW**          | `confidenceTier = LOW` **ou** confiance modèle < 0.40 **ou** pack LOW                                | Soft-hero minimal ; conseils généraux seulement      |
| **INSUFFICIENT** | `confidenceTier = INSUFFICIENT` **ou** `overallVerdict = INSUFFICIENT_DATA` **ou** pack INSUFFICIENT | Pas de `topAction` intensité ; empty/status honnête  |

**Exposition Eng :** `DecisionState.confidenceTier` + nouveau (ou dérivé) `evidence.packTier` sur le Snapshot pour que Presentation / Today ne recalculent rien.

---

## 4. Provenance obligatoire sous chaque conclusion

Toute conclusion athlète-facing (verdict, frein, alerte récupération atypique, gate plan) doit pouvoir s’ouvrir sur une **provenance** versionnée.

### 4.1 Contenu snapshot à versionner

À persister avec le Decision Record / Athlete Snapshot (immuable — ADR-004) :

| Champ                         | Contenu                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `modelIds`                    | ex. `recovery-synthesis-v1`, `decision-v1`, `physical-health-v1`                                                           |
| `computedAt`                  | ISO timestamp du passage d’inférence                                                                                       |
| `seriesUsed`                  | Identifiants des séries : sleep nuit J, HRV J, RHR J, TSS jours J-6…J, ACWR, conditions actives                            |
| `timestamps`                  | `observedAt` / `syncedAt` par série                                                                                        |
| `freshness`                   | Par domaine (`fresh` / `stale` / `missing` / `pending`) + âges en heures                                                   |
| `missingFields`               | Liste explicite (`sleep.night`, `hrv.morning`, `subjective.wellness`, …)                                                   |
| `weights`                     | Poids objectifs vs journal utilisés **après redistribution** (ex. Autonomic 0.35 → …)                                      |
| `objectiveVsJournal`          | Ratio ou labels : `objectiveWeight`, `subjectiveWeight`, `journalWeighted: boolean`                                        |
| `rationaleCodes`              | Codes stables (ex. `RECOVERY_LOW`, `ILLNESS_RISK_ELEVATED`, `DECISION_INTENSITY_CONFLICT`) — pas de prose LLM comme preuve |
| `packTier` / `confidenceTier` | Flags §3                                                                                                                   |

### 4.2 Règle Design

Sous le hero / frein : lien ou expand « D’où ça vient ? » → provenance (sources + fraîcheur + manques).  
Le briefing LLM peut **reformuler** les `rationaleCodes` ; il ne peut pas ajouter de cause non présente dans le snapshot.

---

## 5. Journal → matrice d’effets

Deux canaux subjectifs distincts dans le code :

1. **Morning wellness** (`POST /api/wellness-checkin`) — pondéré Recovery (dimension Subjective)
2. **Athlete day journal** (`AthleteDayJournal` + `day-context-factors`) — contexte + analyses d’habitudes ; **majoritairement non pondéré** dans Recovery v1

### 5.1 Morning wellness (pondéré — Recovery)

Composite documenté (`RECOVERY_MODEL` §5.3) :

`subjectiveWellnessIndex` = mood ×0.30 + energyLevel ×0.35 + perceivedSoreness (inversé) ×0.25 + stressLevel (inversé) ×0.10

| Champ               | Type       | Effet modèle V0                              | Module                | Copy si non pondéré          |
| ------------------- | ---------- | -------------------------------------------- | --------------------- | ---------------------------- |
| `mood`              | 1–5        | **Oui**                                      | Recovery → Subjective | —                            |
| `energyLevel`       | 1–5        | **Oui**                                      | Recovery → Subjective | —                            |
| `perceivedSoreness` | 0–10       | **Oui**                                      | Recovery → Subjective | —                            |
| `stressLevel`       | 1–5        | **Oui**                                      | Recovery → Subjective | —                            |
| `notes`             | texte ≤500 | **Non** (contexte Coach / journal seulement) | —                     | « noté, pas encore pondéré » |

RPE de séance (`rpe` sur Activity) → `rpeVsTargetZone` **Oui** (modificateur Subjective) quand disponible.

### 5.2 Journal — facteurs jour (`DayContextFactorId`)

**Règle V0 :** sauf ligne « Oui » ci-dessous, **aucun** facteur journal ne déplace readiness / verdict. Affichage athlète : **« noté, pas encore pondéré »**. Les associations habit×physio (`/journal/analyses`) sont **descriptives** (médianes), pas des leviers d’arbitrage Decision.

#### Santé / symptômes (surveillance copy — pas diagnostic)

| Facteur                                               | Effet modèle V0 | Notes                                                                                                                                         |
| ----------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `fever`                                               | **Non** (V0)    | Afficher « noté, pas encore pondéré » ; Privacy : ne pas inférer maladie. _Follow-up :_ corréler avec `illnessRisk` côté Coach **copy only**. |
| `cold_congestion`                                     | Non             | idem                                                                                                                                          |
| `headache`                                            | Non             | idem                                                                                                                                          |
| `pain`                                                | Non*            | _Douleur structurée_ passe par Physical Health (`ConditionObservation`), pas ce toggle journal                                                |
| `allergies`                                           | Non             |                                                                                                                                               |
| `cramps` / `abdominal_cramps`                         | Non             |                                                                                                                                               |
| `medication` / `antibiotic` / `cbd` / `contraception` | Non             | Sensible — Privacy ; pas de poids physiologique V0                                                                                            |
| `pregnant`                                            | Non             | Hors pondération ; contrainte produit / Privacy                                                                                               |

#### Bases / nuit précédente

| Facteur                                                                                                | Effet V0 | Notes                                                          |
| ------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------- |
| `coffee`                                                                                               | Non      | Quantifié aussi via `caffeineMg` — non pondéré Recovery v1     |
| `mood_low`                                                                                             | Non      | Redondant partiel avec wellness `mood` — ne pas double-compter |
| `hydration_low` / `hydration_quality` / `hydrationMl`                                                  | Non      |                                                                |
| `late_meal` / `device_in_bed` / `shared_bed` / `earplugs` / `sleep_mask` / `pet_in_room` / `melatonin` | Non      | Contexte sommeil ; sleep score reste Garmin/observation        |
| `alcohol`                                                                                              | Non      | Follow-up v2 candidate (dette sommeil)                         |
| `night_work`                                                                                           | Non      |                                                                |

#### Compléments / lifestyle / nutrition / behaviour

Tous les IDs restants (`omega3`, `creatine`, `vitamin_d`, `magnesium`, `ashwagandha`, `multivitamin`, `zinc`, `probiotic`, `electrolytes`, `collagen`, `protein_powder`, `sauna`, `ice_bath`, `cold_shower`, `massage`, `mobility`, `meditation`, `yoga`, `easy_walk`, `pneumatic_recovery`, `cupping`, `chiropractor`, `sun_exposure`, `intermittent_fasting`, `added_sugar`, `meal_out`, `skipped_meal`, `tobacco`, `menstruation`, `sexual_activity`, …) → **Non** en V0 → « noté, pas encore pondéré ».

#### Métadonnées journal

| Champ             | Effet V0                                                    |
| ----------------- | ----------------------------------------------------------- |
| `moodLabel`       | Non (label UI ; la pondération humeur = wellness numérique) |
| `caffeineMg`      | Non                                                         |
| Custom trackables | Non                                                         |

### 5.3 Physical Health (séparé du journal)

| Signal                                                                 | Effet                                   | Module                                    |
| ---------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| Condition active / `trainingBlockedByCondition` / capacité `REST_ONLY` | **Oui** — override Decision → `RECOVER` | Physical Health → Decision                |
| `functionalImpact` / sévérité déclarée                                 | **Oui** (état déclaré / inféré Phase 2) | Physical Health                           |
| Toggle journal `pain` seul                                             | **Non**                                 | Orienter l’athlète vers le suivi physique |

### 5.4 `illnessRisk` (Recovery)

| Niveau     | Effet                                        | Copy athlète (wellness)                                                                                                       |
| ---------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `LOW`      | Aucun override                               | —                                                                                                                             |
| `ELEVATED` | Frein / soft caution                         | « Signal de récupération atypique — à surveiller »                                                                            |
| `HIGH`     | Override → `VERY_LOW` / REST (spec Recovery) | « Pattern inhabituel sans charge qui l’explique. Ce n’est pas un diagnostic — écoute ton corps ; avis médical si symptômes. » |

---

## 6. Recalcul A/B

### 6.1 Artefact à conserver

Pour chaque recalcul (sync, wellness submit, refresh) :

```
RecalcArtefact {
  artefactId
  trainingDayId
  triggeredBy          // ManualWellnessSubmitted | ProviderSyncCompleted | …
  inputSnapshot        // hash + payload des features / états moteurs en entrée
  modelIds             // versions exactes
  deterministicVerdict // DecisionState.overallVerdict (+ readinessCategory, limitingFactor)
  rationaleCodes[]     // optionnel mais recommandé
  packTier
  confidenceTier
  computedAt
}
```

- **A** = dernier artefact **commité** (exposé Snapshot)
- **B** = candidat recalcul

### 6.2 Protocole

1. Calculer B hors bande (ne pas écraser A pendant le run).
2. Valider B : schémas OK, `packTier` cohérent, pas d’exception, fingerprint stable.
3. **Succès** → commit B comme nouveau Snapshot (A reste en audit trail).
4. **Échec** → **rollback A** : Snapshot inchangé ; log erreur ; UI ne montre pas B partiel.
5. Idempotence : même fingerprint → pas d’écriture (ATHLETE_SNAPSHOT §3.2).

Le LLM **n’entre pas** dans A/B du verdict. Le briefing peut être régénéré après commit B, sans modifier le verdict.

---

## 7. Plan intensity gate (soft déjà shippé — réaffirmation)

### 7.1 État code actuel

`decisionCompatibilityRule` (`src/lib/plan-gate/rules/decision-compatibility.ts`) via `PLAN_GATE_HIGH_INTENSITY` (`src/lib/plan-gate/high-intensity.ts`, aligné `HARD_SESSION_INTENSITIES`) :

- Si `overallVerdict ∈ { RECOVER, CAUTION }` **et** intensité ∈ `{ TEMPO, THRESHOLD, VO2MAX, RACE }` → **REJECTED** + alternative `ENDURANCE`
- `TEMPO` **est** dans le set haute intensité (PASS V0)
- `confidenceTier = INSUFFICIENT` → `REQUIRES_CONFIRMATION`
- Fatigue `REST_ONLY` / `LIGHT_ONLY` : règles additionnelles

### 7.2 Position Science Sport V0 (réaffirmation)

**Réaffirmer :** sous `RECOVER` ou `CAUTION`, **retenir** (reject ou requires confirmation) les intensités :

| Intensité   | V0 Science Sport                 | Code actuel                           |
| ----------- | -------------------------------- | ------------------------------------- |
| `RECOVERY`  | Autorisée                        | OK                                    |
| `ENDURANCE` | Autorisée (souvent safer alt.)   | OK                                    |
| **`TEMPO`** | **Retenir** sous RECOVER/CAUTION | **PASS** (`PLAN_GATE_HIGH_INTENSITY`) |
| `THRESHOLD` | Retenir                          | PASS                                  |
| `VO2MAX`    | Retenir                          | PASS                                  |
| `RACE`      | Retenir                          | PASS                                  |

Le Gate reste **hors Core** (ADR-005) : pure validation vs DecisionState, pas de nouvelle inférence.

Copy gate (déjà FR dans le code) : conserver le ton « cohérence avec l’état de récupération » — pas de formulation médicale.

---

## 8. Hors scope V0 / follow-ups

| Hors V0                                           | Pourquoi                            | Suivi                                           |
| ------------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| Pondération des facteurs journal dans Recovery    | Pas de preuves / params individuels | v2 — protocole subjectif dédié (SD-010)         |
| Calibration individuelle poids Recovery           | Besoin ≥ 90 j                       | recovery-synthesis-v2                           |
| Glycogène / nutrition dans readiness              | Non observable consumer             | v3+                                             |
| Diagnostic différentiel illness vs OTS vs fatigue | Impossible wellness                 | Rester sur `illnessRisk` pattern + Privacy copy |
| Persistance GateResult                            | ADR-005 : response-only             | Decision Memory phase                           |
| Soft-hero Design final pixels                     | Spec comportement ici               | Design Language / Today                         |
| Seuils H1–H5                                      | Hypothèses endurance                | Validation Science Sport + dogfooding           |
| LLM comme filet de vérité                         | Interdit                            | Continuer audit Coach prompts                   |
| Claims marketing médicaux                         | Privacy / MDR                       | Disclaimer V0 inchangé                          |

---

## Checklist d’implémentation (Design / Eng / Privacy)

**Eng**

- [ ] Exposer `evidence.packTier` + fraîcheurs §2.4 sur Snapshot
- [ ] Brancher soft-hero / hard sur `packTier` × `confidenceTier` (Presentation)
- [ ] Provenance snapshot (§4) versionnée avec Decision Record
- [ ] Recalc A/B fail → rollback A (§6)
- [x] Gate : `TEMPO` retenu sous RECOVER/CAUTION via `PLAN_GATE_HIGH_INTENSITY` (§7)
- [ ] Matrice journal : aucun poids non documenté (§5)

**Design**

- [ ] Soft-hero « estimation partielle » + manques visibles (§3.2)
- [ ] Expand provenance sous conclusions (§4.2)
- [ ] Libellé « noté, pas encore pondéré » sur facteurs journal non pondérés
- [ ] Copy `illnessRisk` = récupération atypique (jamais « malade »)

**Privacy**

- [ ] Disclaimer wellness inchangé sur Today / alertes
- [ ] Pas de claim diagnostic sur fièvre / congestion / illnessRisk
- [ ] Facteurs santé journal = données sensibles ; pas d’inférence clinique

---

## Références internes

- Recovery : dimensions, redistribution poids, `INSUFFICIENT_DATA`, `illnessRisk`, confiance
- Decision : `OverallVerdict`, `confidenceTier`, safety-first arbitration
- Snapshot : source de vérité produit, fraîcheur domaines
- Plan-gate : ADR-005, `decision-compatibility`
- Journal : `day-context-factors.ts`, morning wellness schema
- Privacy : `PRIVACY_MINI_V0` / disclaimer médical

---

_Fin — Grille de fiabilité Sharpit V0 · Science Sport_
