import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from '@/components/coach/chat/markdown';

const SAMPLE = `## Semaine du 19 août

Ta charge est **stable**, mais le sommeil décroche.
Deux nuits < 6h30 sur les cinq dernières.

### Plan

1. Mardi — sortie vélo Z2, 1h30
2. Jeudi — seuil course 3×8'

| Jour | Séance | Durée |
| --- | --- | --- |
| Mar | Vélo Z2 | 1h30 |
| Jeu | Seuil | 55 min |

- [x] Renfo réalisé
- [ ] Mobilité hanches

> Ne monte pas le volume tant que le sommeil ne remonte pas.

Utilise \`FTP 265W\` comme référence. Voir [le détail](https://example.com/plan).

---

*Ajustable à tout moment.*
`;

describe('Markdown', () => {
  it('rend une réponse coach complète sans planter', () => {
    const html = renderToStaticMarkup(createElement(Markdown, null, SAMPLE));

    // Tableau encapsulé dans son conteneur scrollable, pas de débordement du bubble.
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('<table');
    // Retour à la ligne simple = saut de ligne réel.
    expect(html).toContain('<br/>');
    expect(html).toContain('type="checkbox"');
    // Lien externe isolé de l'onglet courant.
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it('referme le markdown coupé en cours de streaming', () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, { streaming: true }, 'Ta **séance de seuil'),
    );

    expect(html).toContain('coach-streaming');
    expect(html).toContain('<strong');
    expect(html).not.toContain('**');
  });
});
