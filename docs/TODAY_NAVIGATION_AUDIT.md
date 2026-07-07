# Audit navigation — Today / Digital Twin

Audit du 7 juillet 2026. Objectif : chaque interaction sur Today renvoie vers la page d’exploration du modèle physiologique correspondant.

## Architecture cible

```
Today (/)
├── Sommeil          → /today/sleep
├── Récupération     → /today/recovery
├── Effort (strain)  → /today/effort
├── Adaptation       → /today/adaptation
├── Séance réalisée  → /training/{id}
└── Séance prévue    → /seances?tab=planning
```

La confiance et le facteur limitant pointent vers le modèle qui pilote la synthèse du jour (`systemAttentionPriority` ou `limitingFactor.system`).

## Éléments audités

| Élément                    | Destination avant       | Statut       | Destination après               |
| -------------------------- | ----------------------- | ------------ | ------------------------------- |
| Anneau Sommeil             | `/today/sleep`          | ✅ Correct   | inchangé                        |
| Anneau Récupération        | `/today/recovery`       | ✅ Correct   | inchangé                        |
| Anneau Effort              | `/today/effort`         | ✅ Correct   | inchangé                        |
| Anneau Adaptation          | `/today/effort`         | ❌ Incorrect | `/today/adaptation`             |
| Trajectoire hebdo (liens)  | 3 dims, pas Adaptation  | ⚠️ Incomplet | 4 dims Twin                     |
| Facteur limitant           | Texte seul              | ❌ Manquant  | drill-down selon `system`       |
| Séance réalisée            | `/training/{id}`        | ✅ Correct   | inchangé                        |
| Séance prévue              | Texte seul              | ⚠️ Ambigu    | `/seances?tab=planning`         |
| Confiance (TwinTrustStrip) | Non cliquable           | ⚠️ Manquant  | modèle prioritaire              |
| Message produit (bannière) | Non cliquable           | ✅ OK        | informatif, pas de domaine typé |
| Planning vide              | `/seances?tab=planning` | ✅ Correct   | inchangé                        |
| Bloc Pourquoi              | Non cliquable           | ✅ OK        | synthèse narrative              |

## Corrections implémentées

1. **`src/lib/today-twin-navigation.ts`** — routes canoniques et résolution `limitingFactor` / confiance.
2. **`/today/adaptation`** — page drill-down dédiée au modèle d’adaptation.
3. **`today-metrics-row.tsx`** — anneau Adaptation → `/today/adaptation`.
4. **`today-weekly-trajectory.tsx`** — liens vers les 4 dimensions Twin.
5. **`today-action-row.tsx`** — facteur limitant et séances prévues cliquables.
6. **`twin-trust-strip.tsx`** — confiance liée au modèle de synthèse.

## Hiérarchie recommandée

```
/today/*          Exploration quotidienne par dimension (Digital Twin)
/training/*       Détail d’une séance réalisée
/seances          Catalogue + planning
/recovery         Redirect legacy → /today/recovery
```

Aucune dimension Twin ne doit rediriger vers une page d’un autre modèle (ex. Adaptation ≠ Effort).
