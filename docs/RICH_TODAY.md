# Rich Today — Sprint 2 (+ Context-Aware Sprint 3)

Product Sprint 2 recentre l’expérience **Today** sur cinq questions athlète. Sprint 3 rend ces questions **dynamiques** selon la `DailyPhase` du Snapshot (voir [`CONTEXT_AWARE_TODAY.md`](CONTEXT_AWARE_TODAY.md)).

## Les cinq questions

| #   | Question                               | Composant                                                        | Source Snapshot                                              |
| --- | -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Puis-je m’entraîner fort aujourd’hui ? | `TodayVerdictHero` — titre + réponse courte                      | `reasoning.overallVerdict`, `adviceActionable`               |
| 2   | Pourquoi ?                             | `TodayWhyBlock`                                                  | `reasoning.keyFindings` (prioritaire), sinon briefing validé |
| 3   | Qu’est-ce qui limite ma progression ?  | `TodayActionRow` (colonne gauche)                                | `limitingFactor`, `adaptation.limitingFactor`                |
| 4   | Que dois-je faire aujourd’hui ?        | `TodayVerdictHero` (ligne d’action) + `TodayActionRow` (séances) | `reasoning.topAction`, `daySummary`                          |
| 5   | Est-ce que je progresse ?              | `TodayWeeklyTrajectory`                                          | `adaptation`, sparklines récup./charge, `weeklyLoad`         |

## Hiérarchie d’information (haut → bas)

1. **Bannière statut** (si message produit ou données insuffisantes)
2. **Verdict hero** — question 1, décision du jour, 4 scores physiologiques, confiance
3. **Pourquoi** — explication scientifique courte (2–3 lignes max)
4. **Action row** — facteur limitant | séance du jour
5. **Trajectoire hebdo** — progression + liens drill-down

Largeur max `max-w-3xl` : un seul flux vertical, lecture en &lt; 20 secondes sans scroll excessif.

## Rationale par élément visible

### `SnapshotStatusBanner`

- **Réduit l’incertitude** : explique pourquoi le verdict est absent ou en cours de mise à jour.
- **Retiré quand** : aucun message (état nominal).

### `TodayVerdictHero`

- **Verdict** (`mapVerdictDisplay`) : réponse directe Q1.
- **Sous-titre** (`canTrainHardAnswer`) : nuance scientifique sans jargon.
- **Ligne d’action** (`buildTopActionLine`) : Q4 en une phrase.
- **4 anneaux** : Sommeil, Récupération, Effort, Adaptation — les scores les plus actionnables ; liens vers `/today/sleep`, `/today/recovery`, `/today/effort`.
- **TwinTrustStrip** : transparence confiance (Sprint 1) ; pas de facteur limitant ici (évite duplication avec action row).

### `TodayWhyBlock`

- **Priorité** : `keyFindings` déterministes du moteur de raisonnement.
- **Fallback** : premiers paragraphes du briefing LLM validé.
- **Absent** si aucune source fiable — pas de texte générique.

### `TodayActionRow` — facteur limitant

- **Q3** : `limitingFactor` du snapshot ou `adaptation.limitingFactor`.
- Message neutre si aucun frein identifié.

### `TodayActionRow` — séance du jour

- **Q4** : séances réalisées + prévues (`buildTodayDaySummary`).
- Lien planning uniquement si journée vide.
- `MorningWellnessDialog` conservé (saisie matinale).

### `TodayWeeklyTrajectory`

- **Q5** : statut d’adaptation + TSS semaine + sparklines 14j.
- Liens **Approfondir** : Récupération, Sommeil, Charge — pages détail pour les 20 % restants.

## Retiré du dashboard principal

| Ancien composant                      | Raison                                            |
| ------------------------------------- | ------------------------------------------------- |
| `NarrativeHeader`                     | Dupliquait verdict + pourquoi + briefing          |
| `SessionBlock`                        | Fusionné dans `TodayActionRow`                    |
| `ActivityConsistencyPanel`            | Ne répond à aucune des 5 questions                |
| `EvolutionChart`                      | Remplacé par sparklines compactes (trajectoire)   |
| `HealthMonitorPanel`                  | Drill-down via pages Sommeil / Récupération       |
| `PlanningRow`                         | Séances futures hors jour courant → lien planning |
| `TodayGoalsStrip`                     | Hors scope des 5 questions                        |
| Grille 2 colonnes narrative / session | Remplacée par flux unique                         |

Les composants restent dans le codebase pour réutilisation ou pages détail ; ils ne sont plus montés sur Today.

## Comparaison avant / après

| Dimension          | Avant (post Sprint 1)                                 | Après (Rich Today)                    |
| ------------------ | ----------------------------------------------------- | ------------------------------------- |
| Structure          | 5 zones (métriques, grille 2×2, graphiques, planning) | 4 blocs linéaires                     |
| Scroll             | Élevé (graphiques + panels)                           | Réduit (~1 écran)                     |
| Verdict            | Dans `NarrativeHeader`, partagé avec briefing         | Hero dédié, première chose lue        |
| Pourquoi           | Briefing LLM + keyFindings dans session               | Bloc unique, keyFindings prioritaires |
| Limitant           | TwinTrustStrip + narrative                            | Colonne dédiée Q3                     |
| Progression        | `EvolutionChart` + adaptation enfouie                 | Section trajectoire + sparklines      |
| Scores             | 3 anneaux                                             | 4 anneaux (+ Adaptation)              |
| Planning           | Ligne complète séances futures                        | Intégré au jour ; lien si vide        |
| Cas non-actionable | Layout différent                                      | Même hiérarchie, messages honnêtes    |

## Fichiers clés

- `src/components/today/today-dashboard.tsx` — orchestration
- `src/components/today/rich/*` — blocs Rich Today
- `src/lib/today-rich-view.ts` — logique pure (verdict, pourquoi, progression)
- `src/components/today/dashboard/use-today-dashboard-view-model.ts` — VM (+ `weeklyLoad`)

## Contraintes respectées

- Aucun nouveau modèle physiologique.
- Aucune refonte architecture : lecture exclusive via **Athlete Snapshot** + agrégats UI existants (`daySummary`, sparklines).
- Sprint 1 **Truthfulness** préservé : `adviceActionable`, pas de score effort fictif, messages insuffisants.

## Parcours drill-down

Today couvre ~80 % des questions. Investigation :

- `/today/sleep` — détail sommeil
- `/today/recovery` — récupération, VFC, dimensions
- `/today/effort` — charge, strain, adaptation
- `/seances?tab=planning` — planning complet
