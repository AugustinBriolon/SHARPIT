# Design — Brief confiance V0

> **Statut :** notes Design pour la grille fiabilité Science Sport V0  
> **Canon Science :** [`docs/science/reliability-grid-v0.md`](../science/reliability-grid-v0.md)  
> **Loi visuelle :** [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md) · [`DESIGN_SYSTEM_PROMPT.md`](./DESIGN_SYSTEM_PROMPT.md) · [`INFORMATION_ARCHITECTURE.md`](./INFORMATION_ARCHITECTURE.md)

Ce brief **n’ajoute pas** une esthétique parallèle. Il précise comment le hero Today et le Journal expriment la confiance du pack.

---

## 1. Hero piloté par `packTier`

| Tier | Comportement |
| ---- | ------------ |
| `FULL` | Hero actuel (verdict déterministe tel quel) |
| `PARTIAL` / `LOW` | Soft-hero : titre hedged + chip **Estimation partielle** + gaps visibles |
| `INSUFFICIENT` | Pas d’`topAction` d’intensité ; CTA compléter les sources / attendre la sync |

Copy : jamais « taper fort » / race-ready sans `FULL`.  
`illnessRisk` → chip récupération atypique uniquement (pas de diagnostic).

---

## 2. Provenance sous le hero

Collapsible **Pourquoi** :

- séries utilisées ;
- âge des données ;
- gaps ;
- poids journal vs objectif ;
- `rationaleCodes` lisibles en français.

Pas de glass hors allowlist chrome. Pas d’em dash dans le copy FR.

---

## 3. Journal

- Un seul callout d’en-tête : *Recovery lit 4 signaux matin : le reste est archivé pour toi, pas encore dans le modèle* (pas d’em dash).
- Champs morning wellness pondérés Recovery v1 (humeur, énergie, courbatures, stress) : badge positif vert **Pris en compte** uniquement.
- Autres facteurs journal : lignes silencieuses (pas de badge « Noté, pas encore pondéré » ni ton d’échec par ligne).

---

## 4. Recalc

1. Chips loading → état B.
2. Échec → rollback A + toast.
3. Succès B → optionnel **Voir ce qui a changé** (diff court A/B).
