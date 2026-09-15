# Design — Brief confiance V0

> **Statut :** notes Design pour la grille fiabilité Science Sport V0  
> **Canon Science :** [`docs/science/reliability-grid-v0.md`](../science/reliability-grid-v0.md)  
> **Loi visuelle :** [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md) · [`DESIGN_SYSTEM_PROMPT.md`](./DESIGN_SYSTEM_PROMPT.md) · [`INFORMATION_ARCHITECTURE.md`](./INFORMATION_ARCHITECTURE.md)

Ce brief **n’ajoute pas** une esthétique parallèle. Il précise comment le hero Today et le Journal expriment la confiance du pack.

---

## 1. Hero piloté par `packTier`

| Tier              | Comportement                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `FULL`            | Hero actuel (verdict déterministe tel quel). Dot Lime. Pas de panel « Pourquoi ».                                     |
| `PARTIAL` / `LOW` | Soft-hero : titre hedged + chip **Estimation partielle** + gaps visibles. Dot **amber** (`signal-caution`), pas Lime. |
| `INSUFFICIENT`    | Pas d’`topAction` d’intensité ; CTA compléter les sources / attendre la sync. Dot **gris** (muted), pas Lime.         |

Copy : jamais « taper fort » / race-ready sans `FULL`.  
`illnessRisk` → chip récupération atypique uniquement (pas de diagnostic).

Les dots / barres de confiance soft-hero ne doivent pas lire « ok » (Lime) pour `PARTIAL` / `INSUFFICIENT`.

---

## 2. Sous le hero (soft-hero only)

Pas de collapsible **Pourquoi** sur Today (retiré). Sous le verdict, uniquement :

- soft-hero (`PARTIAL` / `LOW` / `INSUFFICIENT`) : chip Estimation partielle / Données insuffisantes + 1–2 puces gaps FR ;
- CTA compléter les sources / attendre la sync quand `INSUFFICIENT` ;
- pas d’âges de sync bruts ni de `rationaleCodes` sur le hero.

Pas de glass hors allowlist chrome. Pas d’em dash dans le copy FR.

---

## 3. Journal

- Un seul callout d’en-tête, **uniquement en haut de l’écran Journal** (après le titre, avant Analyses / Personnaliser) : _Recovery lit 4 signaux matin : le reste est archivé pour toi, pas encore dans le modèle_ (pas d’em dash).
- Ne pas remonter ce callout sous le bouton Analyses, ni dans Today / dialogs wellness / ailleurs.
- Champs morning wellness pondérés Recovery v1 (humeur, énergie, courbatures, stress) : badge positif vert **Pris en compte** uniquement.
- Autres facteurs journal : lignes silencieuses (pas de badge « Noté, pas encore pondéré » ni ton d’échec par ligne).

---

## 4. Recalc

1. Chips loading → état B.
2. Échec → rollback A + toast.
3. Succès B → optionnel **Voir ce qui a changé** (diff court A/B).
