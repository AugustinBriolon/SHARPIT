# Product Insight Layer

## Definition

`Product Insight` est la couche de lecture produit situee entre l'etat physiologique calcule et le rendu UI.

Un insight est :

- deterministe ;
- tracable ;
- independant de React, Next, Prisma et des hooks client ;
- construit a partir du `AthleteSnapshot` ou, en transition, d'un input produit deja utilise par la page.

Son but n'est pas d'exposer une metrique supplementaire, mais d'exprimer ce que cette metrique change pour l'athlete.

## Contrat

Le contrat canonique vit dans `src/core/product-insight/types.ts`.

Un `ProductInsight` contient :

- `id`
- `title`
- `summary`
- `explanation`
- `evidence`
- `confidence`
- `importance`
- `decisionImpact`
- `relatedDimensions`

Les pages consomment un `ProductInsightBundle` compose de :

- `primary`
- `supporting`
- `contextual`

## Differences with other layers

### Observation

L'observation decrit ce qui a ete mesure ou saisi.

### Feature

La feature normalise ou extrait un signal exploitable par les modeles.

### Twin / inference

Le Twin produit un etat physiologique interpretable par le moteur.

### Snapshot

Le snapshot consolide l'etat du jour en source canonique.

### Product Insight

Le Product Insight traduit ce que cet etat signifie pour une decision athlete, sans melanger logique UI et logique physiologique.

## Generation rules

- Un insight doit etre construit depuis des inputs deterministes.
- Il ne porte aucune classe CSS ni regle de rendu.
- Il doit rester comprehensible sans connaitre le nom d'une feature brute.
- Les preuves (`evidence`) doivent permettre de remonter aux champs source.
- Les pages peuvent encore afficher des charts ou stats, mais la lecture primaire doit venir des insights.

## What deserves an insight

Un champ merite un insight si au moins une de ces conditions est vraie :

- il change la decision d'entrainement du jour ;
- il change la gestion de la recuperation ;
- il explique un frein ou une opportunite du bloc ;
- il augmente la confiance ou la prudence d'interpretation ;
- il aide a comprendre une trajectoire corporelle utile.

Une metrique ne merite pas un insight si elle ne fait qu'afficher un chiffre sans changer la comprehension athlete.

## Architecture

- Domaine pur : `src/core/product-insight/*`
- Projections applicatives : `src/lib/product-insight/*`
- Rendu generique : `src/components/product-insight/*`

Les builders de domaine sont purs et par surface :

- `recovery-insights.ts`
- `sleep-insights.ts`
- `effort-insights.ts`
- `adaptation-insights.ts`
- `body-insights.ts`

Les projections applicatives adaptent le snapshot et les donnees secondaires necessaires pendant la transition :

- `recovery-page-insights.ts`
- `sleep-page-insights.ts`
- `effort-page-insights.ts`
- `adaptation-page-insights.ts`
- `body-page-insights.ts`

## Migration strategy

### Recovery

Les formulations d'intensite realiste, facteur limitant, dissonance et fenetre de retour passent par les insights.

### Sleep

La lecture primaire devient l'impact de la nuit et l'action de ce soir ; les phases restent une preuve secondaire.

### Effort

Le cout du jour, la marge restante et le contexte de charge passent par les insights ; les charts restent un support.

### Adaptation

La lecture du bloc, la decision de progression et les freins principaux passent par les insights.

### Body

La page reste hors snapshot a court terme, mais consomme le meme contrat d'insight pour la trajectoire, le contexte de mesure et les signaux sante.

## Migration boundary

Les pages ne doivent plus recreer localement :

- des verdicts metier ;
- des reformulations de signaux ;
- des regroupements ad hoc de champs snapshot.

Elles peuvent encore recevoir :

- des series pour charts ;
- des stats secondaires ;
- des donnees brutes necessaires aux composants d'appui.

## Verification

- `core/product-insight` ne depend d'aucun hook, React, Next ou Prisma.
- Les pages detail utilisent les insights comme couche de lecture primaire.
- Les metriques secondaires restent visibles seulement comme support.
