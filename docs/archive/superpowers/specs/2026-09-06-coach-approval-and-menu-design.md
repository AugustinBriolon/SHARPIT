# Coach approval card + Actions menu placement

## Scope

1. Enrich `/coach` tool approval cards so the athlete can see intent + déroulé before Valider.
2. Slim the semaine `Actions` menu and place each tool on its most relevant surface.

## Approval card (BEFORE accept)

- Show: sport · intent prose (durée · intensité · charge) · date
- Show: déroulé preview — description text, or first endurance/strength steps, truncated
- Keep Valider / Refuser
- Apply to create / update / brick (brick: list legs). Delete stays consequence-focused.

## Menu redistribution

| Action                 | Primary home                           | Semaine menu                       |
| ---------------------- | -------------------------------------- | ---------------------------------- |
| Planifier une séance   | `+` on day                             | Remove                             |
| Saisir une séance      | `/activite/nouvelle` (Today / history) | Remove                             |
| Bilan hebdo            | Hub Plan → `/plan/bilan`               | Remove                             |
| Remplir ma semaine     | Semaine + empty hub CTA                | Keep                               |
| Ajuster l'existant     | Coach discuss « Ma semaine » / semaine | Keep                               |
| Plan jusqu'à la course | Hub Plan (destination)                 | Remove from semaine; add hub entry |

Semaine `Actions` menu becomes: Remplir + Ajuster only (label stays Actions).
