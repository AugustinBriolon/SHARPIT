# Design — Brief confiance V0

> **Statut :** notes Design pour la grille fiabilité Science Sport V0  
> **Canon Science :** [`docs/science/reliability-grid-v0.md`](../science/reliability-grid-v0.md)  
> **Loi visuelle :** [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md) · [`DESIGN_SYSTEM_PROMPT.md`](./DESIGN_SYSTEM_PROMPT.md) · [`INFORMATION_ARCHITECTURE.md`](./INFORMATION_ARCHITECTURE.md)

Ce brief **n’ajoute pas** une esthétique parallèle. Il précise comment le hero Today et le Journal expriment la confiance du pack.

---

## 1. Hero piloté par `packTier`

| Tier              | Comportement                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `FULL`            | Hero actuel (verdict déterministe tel quel). Dot Lime. Résumé Pourquoi **Complet** (jamais le label machine `FULL`).  |
| `PARTIAL` / `LOW` | Soft-hero : titre hedged + chip **Estimation partielle** + gaps visibles. Dot **amber** (`signal-caution`), pas Lime. |
| `INSUFFICIENT`    | Pas d’`topAction` d’intensité ; CTA compléter les sources / attendre la sync. Dot **gris** (muted), pas Lime.         |

Copy : jamais « taper fort » / race-ready sans `FULL`.  
`illnessRisk` → chip récupération atypique uniquement (pas de diagnostic).

Les dots / barres de confiance soft-hero ne doivent pas lire « ok » (Lime) pour `PARTIAL` / `INSUFFICIENT`.

---

## 2. Provenance sous le hero

Collapsible **Pourquoi** (lecture athlète par défaut) :

- 2–3 phrases FR lisibles (pas de label machine `FULL` / `PARTIAL` / …) ;
- résumé collapsed : **Complet** / Estimation partielle / Données insuffisantes ;
- soft-hero (`PARTIAL` / `LOW` / `INSUFFICIENT`) : 1–2 puces gaps FR + chip Estimation partielle / Données insuffisantes ;
- **pas** d’âges de sync bruts ni de `rationaleCodes` dupliqués dans le Pourquoi Essential ;
- détail technique (séries, âges, codes) derrière **Mode Expert** uniquement.

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
