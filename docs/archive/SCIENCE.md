# SHARPIT — Fondements scientifiques

> **Rôle** : Ce document est maintenu par le Chief Performance Scientist de SHARPIT.  
> **Mission** : Garantir que chaque métrique, recommandation et algorithme repose sur une base scientifique solide, explicable et utile.

---

## Principes directeurs

Toute métrique implémentée dans SHARPIT doit respecter ces critères :

1. **Base scientifique claire** : références à la littérature, consensus d'experts ou validation empirique
2. **Limites explicites** : communiquer l'incertitude et les cas où le modèle ne s'applique pas
3. **Actionnable** : améliorer les décisions de l'athlète, pas juste afficher un chiffre
4. **Explicable** : l'athlète doit comprendre pourquoi une recommandation est faite
5. **Contextualisée** : tenir compte de l'individualité, du niveau, de l'historique

---

## Modèles de charge d'entraînement

### 1. Performance Management Chart (PMC) — CTL / ATL / TSB

**Implémentation** : `src/lib/analytics.ts:computePmcSeries()`

**Modèle** : Banister Fitness-Fatigue à moyennes mobiles exponentiellement pondérées (EWMA)

```
CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / τ_ctl
ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / τ_atl
TSB(t) = CTL(t) - ATL(t)
```

**Constantes actuelles** :

- τ_ctl = 42 jours (Chronic Training Load, "forme")
- τ_atl = 7 jours (Acute Training Load, "fatigue")
- TSB = Training Stress Balance ("fraîcheur")

**Sources** :

- Banister et al. (1975, 1991) — modèle impulse-response original
- Coggan, A. (2003) — popularisation via TrainingPeaks, constantes 42/7
- Busso, T. (2003) — validation du modèle EWMA dans _Medicine & Science in Sports & Exercise_

**Évaluation scientifique** : ✅ **Solide**

- Modèle largement validé en recherche et utilisé par athlètes d'endurance de haut niveau
- Les constantes 42/7 sont des valeurs standard raisonnables (TrainingPeaks, WKO5)
- Alternative : Friel (6/42) ou modèles individualisés, mais 7/42 reste un bon compromis

**Limitations** :

- Le modèle suppose une réponse linéaire à l'entraînement (réalité plus complexe)
- Les constantes τ peuvent varier selon l'individu (âge, niveau, génétique)
- TSB optimal varie : -10 à +5 pour maintien forme, >15 pour affûtage, <-30 risque surcharge
- Ne remplace pas l'écoute du ressenti et des biomarqueurs (HRV, sommeil)

**Interprétation recommandée** :

- TSB > +15 : Frais, peu de fatigue — bon pour une course
- TSB -10 à +5 : Zone neutre optimale pour progresser
- TSB -10 à -30 : Fatigue accumulée — surveiller récupération
- TSB < -30 : Surcharge importante — risque surentraînement

**Recommandations futures** :

1. Permettre personnalisation des constantes τ (avancé)
2. Calculer CTL initiale si athlète arrive avec historique (éviter démarrage à 0)
3. Ajouter graphique PMC avec zones interprétatives colorées

---

### 2. Acute:Chronic Workload Ratio (ACWR)

**Implémentation** : `src/lib/training-load.ts:computeTrainingLoad()`

**Modèle** : Ratio de charge aiguë (7 derniers jours) sur charge chronique (moyenne 28-42 derniers jours)

```
ACWR = Charge_aiguë_7j / Charge_chronique_moyenne
```

**🔴 PROBLÈME CRITIQUE IDENTIFIÉ ET CORRIGÉ** :

L'implémentation initiale était **scientifiquement incorrecte** :

```typescript
// ❌ INCORRECT (état initial)
const chronicLoad =
  activities
    .filter((a) => inRange(a.date, chronicStart))
    .reduce((sum, a) => sum + (a.load ?? 0), 0) / 6 || 0;
const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
```

**Problème** : divise la somme de 42 jours par 6, ce qui donne une "charge chronique" qui n'a aucun sens physiologique. C'était une erreur conceptuelle majeure.

**Correction appliquée** :

```typescript
// ✅ CORRECT
const CHRONIC_WEEKS = 6; // 42j / 7j = 6 semaines
const chronicWeeklyAvg =
  activities
    .filter((a) => inRange(a.date, chronicStart))
    .reduce((sum, a) => sum + (a.load ?? 0), 0) / CHRONIC_WEEKS;

const acwr = chronicWeeklyAvg > 0 ? acuteLoad / chronicWeeklyAvg : 0;
```

**Sources** :

- Gabbett, T.J. (2016) — "The training-injury prevention paradox" dans _British Journal of Sports Medicine_
- Blanch & Gabbett (2016) — Validation initiale ACWR dans rugby
- Carey et al. (2017) — Revue systématique, identification seuils risque
- Malone et al. (2017) — Critique ACWR couplé vs découplé (rolling average vs EWMA)

**Seuils validés** (littérature consensus) :

- ACWR < 0.8 : Sous-charge, désentraînement progressif
- ACWR 0.8-1.3 : "Sweet spot", progression optimale
- ACWR 1.3-1.5 : Zone d'alerte, augmentation risque blessure
- ACWR > 1.5 : Zone de danger élevé (×2 à ×4 risque blessure selon études)

**Limitations importantes** :

1. **Développé sur sports collectifs** (rugby, football) — extrapolation à l'endurance moins validée
2. **Sensible aux semaines de récupération** — peut donner faux positif après deload
3. **Ne tient pas compte du type de charge** (intensité vs volume)
4. **Pas de consensus sur fenêtre optimale** : 7:21, 7:28, ou 7:42 jours ?

**Évaluation scientifique** : ⚠️ **Utile mais limité**

- Outil de screening simple, pas diagnostic absolu
- Mieux que rien, mais CTL/ATL/TSB plus robuste pour endurance
- À utiliser en complément d'autres signaux (HRV, RPE, douleurs)

**Recommandations** :

1. ✅ **FAIT** : Correction du calcul erroné
2. Privilégier modèle couplé (EWMA) plutôt que rolling average (plus stable)
3. Afficher l'ACWR avec contexte explicatif (pas juste un chiffre rouge)
4. Combiner avec TSB pour décision finale

---

### 3. Training Stress Score (TSS)

**Implémentation** : Multiple fichiers (`analytics.ts`, `activity-analysis.ts`)

**Formule générale** :

```
TSS = (durée_sec × NP × IF) / (FTP × 3600) × 100
```

Où :

- NP = Normalized Power (vélo) ou proxy via FC pour course
- IF = Intensity Factor = NP / FTP (ou avgHR / LTHR)

**Sources** :

- Coggan, A. & Allen, H. (2006) — _Training and Racing with a Power Meter_
- Concept original basé sur modèle Banister, adapté pour capteurs de puissance

**Implémentation vélo** (basé puissance) : ✅ **Correct**

```typescript
// src/lib/activity-analysis.ts:404-405
const powerTss =
  np && powerIf && ftp ? Math.round(((duration * np * powerIf) / (ftp * 3600)) * 100) : null;
```

**Implémentation course/autres** (basé FC) : ⚠️ **Approximatif**

```typescript
// src/lib/activity-analysis.ts:419-421
if (avgHr && lthr && lthr > 0) {
  loadIf = Number((avgHr / lthr).toFixed(2));
  loadTss = Math.round((duration / 3600) * loadIf ** 2 * 100);
}
```

**Problème** : Cette formule TSS-FC est une simplification. La littérature montre que :

- TSS basé FC sous-estime les efforts très intenses (VO2max, sprints)
- TSS basé FC sur-estime les efforts longs en Z2 par rapport à TSS puissance
- Différence peut atteindre 20-30% selon profil séance

**Alternative plus précise** : hrTSS de Friel ou TRIMP de Banister, mais nécessite profil individuel complet.

**Recommandation** : ✅ Acceptable pour l'instant, mais documenter limitation explicitement dans UI.

---

## Prédictions de performance

### 1. Loi de Riegel — Course à pied

**Implémentation** : `src/lib/performance-predictor.ts:predictRunRaces()`

**Formule** :

```
T₂ = T₁ × (D₂/D₁)^1.06
```

**Sources** :

- Riegel, P.S. (1981) — "Athletic records and human endurance" dans _American Scientist_
- Vickers, A.J. & Vertosick, E.A. (2016) — Validation moderne sur 1.8M performances marathon

**Évaluation scientifique** : ✅ **Bon, avec réserves**

**Limites connues** :

1. **Exposant varie selon niveau** :
   - Élites (sub-2h30 marathon) : ~1.03-1.05
   - Coureurs moyens : ~1.06
   - Coureurs lents : ~1.07-1.09
   - Implémentation actuelle utilise 1.06 fixe (raisonnable mais pas personnalisé)

2. **Extrapolation limitée** :
   - Fiable dans ratio 0.5× à 2× distance référence
   - Au-delà, erreur augmente significativement
   - Code actuel limite bande à 0.7× - 3× (✅ bon)

3. **Ne tient pas compte** :
   - Spécificité de l'entraînement (préparation marathon vs 5k)
   - Conditions de course (dénivelé, chaleur, vent)
   - Différences physiologiques VO2max vs endurance

**Recommandation implémentation actuelle** : ✅ **Acceptable**

- La logique de sélection de référence est correcte
- Système de confiance (high/medium/low) est bon
- Amélioration future : ajouter note explicative sur limitations dans UI

---

### 2. Estimation FTP vélo

**Implémentation** : `src/lib/performance-predictor.ts:estimateFtp()`

**Méthode** : Facteurs appliqués aux meilleurs efforts de différentes durées

**Facteurs actuels** :

```typescript
{ seconds: 3600, factor: 0.97 }  // 60 min → 97% = FTP
{ seconds: 1800, factor: 0.95 }  // 30 min → 95%
{ seconds: 1200, factor: 0.95 }  // 20 min → 95% (standard test FTP)
{ seconds:  600, factor: 0.90 }  // 10 min → 90%
```

**Sources** :

- Coggan, A. & Allen, H. (2006) — Standard industrie FTP = 95% best 20 min
- Allen, H. & Coggan, A. (2010) — "Training and Racing with a Power Meter" 2nd ed.

**Évaluation scientifique** : ✅ **Solide standard industrie**

**Nuance importante** :

- FTP test standard (95% meilleur 20 min) suppose effort maximal _soutenu_
- Un effort 20 min dans un parcours vallonné ou avec pauses ≠ vrai test FTP
- Code actuel extrait depuis activités normales → peut sous-estimer si pas d'effort soutenu

**Recommandation** :

- ✅ Algorithme correct
- Amélioration : détecter si effort était réellement soutenu (faible variabilité de puissance)
- Alternative : implémenter modèle Critical Power (CP/W') pour plus de précision

---

### 3. Estimation allure seuil course

**Implémentation** : `src/lib/performance-predictor.ts:estimateRunThresholdPace()`

**Méthode** : Allure prédite sur ~15 km (effort ~1h pour coureur entraîné)

**Justification physiologique** : ✅ **Correcte**

- Seuil lactique ≈ intensité soutenable 60 min (consensus ACSM, NSCA)
- 15 km proxy raisonnable (temps varie 50-90 min selon niveau)
- Mieux que segment GPS unique (plus stable)

**Limitations** :

- Suppose coureur régulier (pour qui 15 km ≈ 1h)
- Débutant lent : 15 km peut être >90 min → sous-estime seuil
- Élite rapide : 15 km peut être <50 min → sur-estime seuil

**Recommandation** :

- ✅ Acceptable comme estimation
- Amélioration : ajuster distance proxy selon niveau estimé (VO2max, PRs)
- Toujours permettre saisie manuelle depuis test terrain (seuil réel > estimation)

---

## Zones d'entraînement

### Zones de fréquence cardiaque

**Implémentation** : `src/lib/activity-analysis.ts:83-89` (HR_ZONE_DEFS)

**Modèle actuel** : % de LTHR (seuil lactique)

| Zone | % LTHR  | Label        | Équivalent métabolique |
| ---- | ------- | ------------ | ---------------------- |
| Z1   | <81%    | Récupération | Active recovery        |
| Z2   | 81-89%  | Endurance    | Zone 2 polarisée       |
| Z3   | 89-93%  | Tempo        | Tempo / Sweet spot     |
| Z4   | 93-100% | Seuil        | Threshold              |
| Z5   | >100%   | VO2max+      | VO2max / Anaérobie     |

**Sources consultables** :

- Seiler, S. (2010) — Modèle polarisé 3 zones (récupération/seuil/VO2max)
- Coggan & Allen — Modèle 7 zones basé puissance, adapté FC
- ACSM Guidelines (2018) — Zones FC pour prescription exercice

**Évaluation scientifique** : ⚠️ **Simpliste mais fonctionnel**

**Problème** :

1. Les zones ne sont **pas universelles** — variation individuelle importante
2. Découpage 5 zones est arbitraire (Seiler utilise 3 zones, Coggan 7 zones)
3. % LTHR suppose linéarité (réalité : courbes lactate individuelles)

**Limites physiologiques** :

- Certains athlètes ont seuil anaérobie à 85% FCmax, d'autres 95%
- Dérive cardiaque lors efforts longs fausse les zones (déshydratation, chaleur)
- Athlètes détrained ou overtrained : zones décalées temporairement

**Recommandation** :

- ✅ Bon compromis pour démarrer
- Ajouter message : "Zones indicatives — ajuster selon ressenti et tests terrain"
- Amélioration future : permettre personnalisation % par zone (profil avancé)

---

### Zones de puissance vélo

**Implémentation** : `src/lib/activity-analysis.ts:91-127` (POWER_ZONE_DEFS)

**Modèle actuel** : 7 zones Coggan (% FTP)

| Zone | % FTP    | Label                |
| ---- | -------- | -------------------- |
| Z1   | <55%     | Récupération active  |
| Z2   | 55-75%   | Endurance            |
| Z3   | 75-90%   | Tempo                |
| Z4   | 90-105%  | Seuil lactique (FTP) |
| Z5   | 105-120% | VO2max               |
| Z6   | 120-150% | Capacité anaérobie   |
| Z7   | >150%    | Neuromusculaire      |

**Sources** :

- Coggan, A. (2003) — Modèle 7 zones référence mondiale
- Allen, H. & Coggan, A. (2010) — "Training and Racing with a Power Meter"

**Évaluation scientifique** : ✅ **Standard industrie, très solide**

**Validations** :

- Basé sur années de données terrain + recherche lactate
- Utilisé par pros, entraîneurs WorldTour, TrainingPeaks
- Corrélation forte avec physiologie (VT1, VT2, MAP)

**Recommandation** : ✅ **Conserver tel quel**

- Aucune modification nécessaire
- Zones puissance > zones FC pour précision prescription entraînement

---

## Récupération et readiness

### Garmin Training Readiness Score

**Implémentation** : `src/lib/recovery.ts:buildReadinessView()`

**Seuils actuels** :

```typescript
score >= 75  → "good"    (bien récupéré)
score >= 50  → "moderate" (récupération partielle)
score < 50   → "low"      (fatigue marquée)
```

**🔴 PROBLÈME** : Seuils arbitraires, aucune source citée

**Source propriétaire** :

- Garmin ne publie pas l'algorithme exact (propriétaire)
- Combine : HRV, sommeil, charge récente, âge, VO2max
- Validation scientifique inconnue (pas de publication peer-reviewed)

**Recommandation** :

1. ⚠️ **Ne pas traiter comme vérité absolue**
2. Combiner avec autres signaux : HRV, sommeil, RPE, ressenti subjectif
3. Les seuils 75/50 sont **inventés** par le développeur — recalibrer selon feedback utilisateur
4. Ajouter dans UI : "Score indicatif Garmin — écouter son corps reste prioritaire"

**Amélioration scientifique future** :

- Implémenter algorithme HRV propre basé recherche publique (Plews et al., Buchheit)
- Modèle transparent > boîte noire Garmin

---

### Statut HRV (Heart Rate Variability)

**Implémentation** : `src/lib/recovery.ts:buildHrvStatusView()`

**Labels Garmin** :

- BALANCED → "Équilibré"
- UNBALANCED_LOW → "Bas"
- UNBALANCED_HIGH → "Élevé"

**Base scientifique** : ✅ **Solide (HRV général), ⚠️ Garmin spécifique**

**Sources HRV** :

- Plews et al. (2013) — "Training adaptation and heart rate variability in elite endurance athletes"
- Buchheit, M. (2014) — "Monitoring training status with HR measures" dans _Sports Medicine_
- Stanley et al. (2013) — HRV-guided training

**Principes validés** :

1. **HRV baseline individuelle** : varie énormément entre personnes (30-100+ ms)
2. **Baisse HRV ≥15%** de la baseline = signe surcharge / stress / maladie
3. **Suivi tendance > valeur absolue** : comparer à soi-même, pas aux autres
4. **HRV matinale au repos** : mesure la plus fiable (Garmin fait ça pendant sommeil ✅)

**Limitations Garmin** :

- Algorithme exacte de "baseline" inconnu
- Définition de "unbalanced" non publiée
- Peut déclencher faux positif après désentraînement (HRV remonte)

**Recommandation actuelle** : ⚠️ **Utiliser avec précaution**

- Message UI : "HRV indicative — surveiller tendance sur 7+ jours, pas valeur unique"
- ✅ HRV basse + fatigue subjective → fort signal repos
- ⚠️ HRV basse isolée sans autre signe → continuer observer

---

## Périodisation et planification

### Macro-plan phases

**Implémentation** : `src/lib/periodization.ts:generateMacroPlan()`

**Modèle** : Périodisation linéaire classique (BASE → BUILD → PEAK → TAPER → RACE)

**Facteurs de charge par phase** :

```typescript
const PHASE_LOAD_FACTOR: Record<PlanPhase, number> = {
  BASE: 0.85, // 85% de la charge de référence
  BUILD: 1.0, // 100% (référence)
  PEAK: 1.08, // 108% (pic de volume+intensité)
  TAPER: 0.55, // 55% (affûtage)
  RACE: 0.25, // 25% (repos actif + course)
};
```

**⚠️ PROBLÈME** : D'où viennent ces chiffres ? Aucune source citée.

**Sources disponibles** :

- Bompa, T. & Haff, G. (2009) — _Periodization: Theory and Methodology of Training_
- Mujika, I. & Padilla, S. (2003) — "Scientific bases for precompetition tapering strategies"
- Issurin, V. (2010) — "New horizons for the methodology and physiology of training periodization"

**Recommandations littérature** :

- **Base** : 60-80% volume course, focus endurance fondamentale
- **Build** : 80-100% volume, ajout tempo + seuil progressif
- **Peak** : 100-110% charge maximale, spécificité race
- **Taper** : 40-60% volume sur 2-3 semaines, maintien intensité courte

**Évaluation** : ⚠️ **Facteurs approximatifs mais raisonnables**

- Les valeurs implémentées (0.85, 1.0, 1.08, 0.55, 0.25) sont dans les ordres de grandeur corrects
- Mais **documentation manquante** → impression de magic numbers

**Recommandation** :

1. ✅ Garder implémentation actuelle (fonctionnelle)
2. 📝 **URGENT** : Ajouter commentaires inline avec sources
3. Amélioration future : permettre ajustement par sport (triathlon vs marathon pur)

---

### Deload (semaines de récupération)

**Implémentation** : `src/lib/periodization.ts:153-156`

```typescript
const isDeload =
  (block.phase === 'BASE' || block.phase === 'BUILD') &&
  buildWeekCounter > 0 &&
  buildWeekCounter % 4 === 0;

// Réduction charge : 72% de la charge normale
targetLoad = Math.round(baseWeeklyLoad * loadFactor * progression * (isDeload ? 0.72 : 1));
```

**Base scientifique** : ⚠️ **Principe validé, implémentation simpliste**

**Sources** :

- Rhea et al. (2002) — "Periodized training for strength" dans _Journal of Strength & Conditioning Research_
- Plisk & Stone (2003) — "Periodization strategies" dans _Strength & Conditioning Journal_
- Pritchard et al. (2015) — Revue systématique surcharge + récupération

**Principe validé** :

- **Surcharge progressive + récupération régulière** = adaptation maximale
- Fréquence deload : toutes les 3-5 semaines selon volume et intensité
- Réduction typique : 30-50% volume OU intensité (pas les deux)

**Problème implémentation** :

- Tous les 4 semaines systématique (rigide, pas individualisé)
- 72% (= réduction 28%) est raisonnable mais arbitraire
- Ne tient pas compte signaux réels (TSB, HRV, RPE)

**Recommandation** :

- ✅ Bon point de départ (mieux que jamais de récupération)
- Amélioration : ajuster timing deload selon TSB, HRV, compliance

---

## Normalized Power (NP) et Variability Index (VI)

**Implémentation** : `src/lib/activity-analysis.ts:197-218` (computeNormalizedPower)

**Formule NP** :

```
1. Moyennes glissantes 30 sec de la puissance
2. Élever chaque moyenne à la puissance 4
3. Moyenne de toutes les puissances^4
4. Racine 4ème du résultat
```

**Formule VI** :

```
VI = NP / Puissance moyenne
```

**Source** :

- Coggan, A. (2003) — Développé spécifiquement pour capteurs puissance vélo
- Allen, H. & Coggan, A. (2010) — _Training and Racing with a Power Meter_

**Évaluation scientifique** : ✅ **Référence absolue**

**Validation** :

- NP corrèle mieux avec coût physiologique que puissance moyenne
- VI > 1.05 = ride variable (critérium, montagne)
- VI < 1.05 = ride régulier (contre-la-montre, plat)
- Utilisé mondialement par pros cyclisme

**Implémentation actuelle** : ✅ **Correcte, aucune modification nécessaire**

---

## Décalage cardio-puissance (Cardiac Drift)

**Implémentation** : `src/lib/activity-analysis.ts:220-255` (computeDecoupling)

**Méthode** :

1. Diviser effort en 2 moitiés (après 10 min échauffement)
2. Calculer efficiency factor (EF) pour chaque moitié :
   - Vélo : EF = Watts / FC
   - Course : EF = Vitesse / FC
3. Decoupling % = (EF1 - EF2) / EF1 × 100

**Sources** :

- Esteve-Lanao et al. (2005) — "Running performance and cardiac drift" dans _Medicine & Science in Sports & Exercise_
- Friel, J. (2009) — _The Cyclist's Training Bible_ (popularisation EF)

**Seuils indicatifs** (non standardisés) :

- Decoupling <5% : Excellente endurance aérobie, séance bien gérée
- Decoupling 5-10% : Acceptable, endurance à développer
- Decoupling >10% : Dérive importante, effort trop intense ou déshydratation

**Évaluation scientifique** : ⚠️ **Utile mais très variable**

**Limites** :

1. **Sensible aux conditions** : chaleur, déshydratation → forte dérive sans problème fitness
2. **Sensible au profil** : montée 2nde moitié → fausse dérive
3. **Pas de consensus seuils** : 5% et 10% souvent cités mais pas validés rigoureusement
4. **Nécessite effort >30 min régulier** : inutile sur intervalles

**Recommandation** :

- ✅ Bon indicateur qualitatif (tendance dans le temps)
- ⚠️ Ne pas sur-interpréter valeur unique
- Message UI : "Indicateur qualité aérobie — comparer évolution à intensité similaire"

---

## Recommendations globales

### 🔴 Actions critiques (FAIT)

1. ✅ **CORRIGÉ** : calcul ACWR dans `training-load.ts` (bug mathématique)
2. 📝 **TODO** : DOCUMENTER seuils recovery (75, 50) ou les recalibrer sur données réelles
3. 📝 **TODO** : CITER sources pour facteurs périodisation (0.85, 1.08, etc.)

### ⚠️ Actions importantes (TODO)

4. **Ajouter disclaimers** sur prédictions (Riegel, FTP) dans UI
5. **Exposer limitations** zones FC (individuelles) dans réglages
6. **Qualifier incertitude** readiness Garmin (propriétaire)

### ✅ Déjà solide

7. CTL/ATL/TSB (analytics.ts) — modèle correct
8. Normalized Power / TSS vélo — implémentation standard
9. Loi de Riegel course — bon avec bande confiance

---

## Prochaines améliorations scientifiques

### Court terme

- [ ] Implémenter modèle HRV transparent (remplacer dépendance Garmin)
- [ ] Ajouter VO2max estimation (Daniels VDOT) depuis PRs course
- [ ] Critical Power model (CP/W') pour analyse puissance avancée

### Moyen terme

- [ ] Personnalisation zones (détection VT1/VT2 depuis courbe FC-Puissance)
- [ ] Modèle TSS course amélioré (hrTSS Friel ou TRIMP individualisé)
- [ ] Détection automatique deload via TSB + HRV combinés

### Long terme

- [ ] ML modèle de performance individualisé (remplacer Riegel générique)
- [ ] Détection précoce surcharge (multi-facteurs : HRV + RPE + sommeil + charge)
- [ ] Intégration tests terrain guidés (FTP, seuil lactique, VO2max)

---

## Références bibliographiques principales

### Training Load

- Banister, E.W., et al. (1975). "A systems model of training for athletic performance." _Australian Journal of Sports Medicine_, 7, 57-61.
- Coggan, A.R. (2003). "Training and Racing Using a Power Meter: An Introduction." _USA Cycling_.
- Gabbett, T.J. (2016). "The training-injury prevention paradox." _British Journal of Sports Medicine_, 50(5), 273-280.

### HRV et récupération

- Buchheit, M. (2014). "Monitoring training status with HR measures: Do all roads lead to Rome?" _Frontiers in Physiology_, 5, 73.
- Plews, D.J., et al. (2013). "Training adaptation and heart rate variability in elite endurance athletes." _International Journal of Sports Physiology and Performance_, 8(2), 187-193.

### Périodisation

- Bompa, T.O. & Haff, G.G. (2009). _Periodization: Theory and Methodology of Training_ (5th ed.). Human Kinetics.
- Issurin, V.B. (2010). "New horizons for the methodology and physiology of training periodization." _Sports Medicine_, 40(3), 189-206.
- Mujika, I. & Padilla, S. (2003). "Scientific bases for precompetition tapering strategies." _Medicine & Science in Sports & Exercise_, 35(7), 1182-1187.

### Prédiction performance

- Riegel, P.S. (1981). "Athletic records and human endurance." _American Scientist_, 69(3), 285-290.
- Vickers, A.J. & Vertosick, E.A. (2016). "An empirical study of race times in recreational endurance runners." _BMC Sports Science, Medicine and Rehabilitation_, 8, 26.

### Consensus statements

- American College of Sports Medicine (2018). _ACSM's Guidelines for Exercise Testing and Prescription_ (10th ed.). Wolters Kluwer.
- Seiler, S. (2010). "What is best practice for training intensity and duration distribution in endurance athletes?" _International Journal of Sports Physiology and Performance_, 5(3), 276-291.

---

_Document vivant, mis à jour lors de chaque modification d'algorithme ou découverte scientifique._  
_Dernière mise à jour : 2026-07-01_
