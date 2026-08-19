import { describe, expect, it } from 'vitest';
import {
  closeOpenMarkdown,
  remarkSoftBreaks,
  splitMarkdownBlocks,
} from '@/lib/coach/markdown-render';

describe('splitMarkdownBlocks', () => {
  it('sépare les paragraphes de premier niveau', () => {
    expect(splitMarkdownBlocks('Un\n\nDeux\n\nTrois')).toEqual(['Un', 'Deux', 'Trois']);
  });

  it('garde une liste espacée en un seul bloc pour préserver la numérotation', () => {
    const source = '1. Échauffement\n\n2. Seuil\n\n3. Retour au calme';
    expect(splitMarkdownBlocks(source)).toEqual([source]);
  });

  it('garde les continuations indentées avec leur item', () => {
    const source = '- Séance 1\n\n  Détail de la séance\n\n- Séance 2';
    expect(splitMarkdownBlocks(source)).toEqual([source]);
  });

  it('garde une citation multi-paragraphes entière', () => {
    const source = '> Première ligne\n\n> Seconde ligne';
    expect(splitMarkdownBlocks(source)).toEqual([source]);
  });

  it('ne coupe pas un bloc de code sur ses lignes vides', () => {
    const source = 'Avant\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAprès';
    expect(splitMarkdownBlocks(source)).toEqual([
      'Avant',
      '```ts\nconst a = 1;\n\nconst b = 2;\n```',
      'Après',
    ]);
  });

  it('sépare un tableau du texte qui le suit', () => {
    const source = '| Jour | Durée |\n| --- | --- |\n| Lun | 45 min |\n\nÀ ajuster.';
    expect(splitMarkdownBlocks(source)).toEqual([
      '| Jour | Durée |\n| --- | --- |\n| Lun | 45 min |',
      'À ajuster.',
    ]);
  });

  it('renonce à découper quand des références traversent les blocs', () => {
    const source = 'Voir [le plan][p].\n\n[p]: https://example.com';
    expect(splitMarkdownBlocks(source)).toEqual([source]);
  });

  it('renvoie une liste vide sur une chaîne blanche', () => {
    expect(splitMarkdownBlocks('   \n\n  ')).toEqual([]);
  });
});

describe('closeOpenMarkdown', () => {
  it('referme un gras coupé en plein mot', () => {
    expect(closeOpenMarkdown('Ta **séance')).toBe('Ta **séance**');
  });

  it('laisse un gras équilibré intact', () => {
    expect(closeOpenMarkdown('Ta **séance** de seuil')).toBe('Ta **séance** de seuil');
  });

  it('referme un bloc de code non terminé', () => {
    expect(closeOpenMarkdown('```ts\nconst a = 1;')).toBe('```ts\nconst a = 1;\n```');
  });

  it('referme un code inline non terminé', () => {
    expect(closeOpenMarkdown('Utilise `yarn de')).toBe('Utilise `yarn de`');
  });

  it('masque un lien encore incomplet', () => {
    expect(closeOpenMarkdown('Ouvre [le plan](https://exa')).toBe('Ouvre ');
    expect(closeOpenMarkdown('Ouvre [le pl')).toBe('Ouvre ');
  });

  it('ne touche pas au contenu à l’intérieur d’un bloc de code ouvert', () => {
    expect(closeOpenMarkdown('```\n**pas du gras')).toBe('```\n**pas du gras\n```');
  });

  it('laisse une chaîne vide telle quelle', () => {
    expect(closeOpenMarkdown('')).toBe('');
  });
});

describe('remarkSoftBreaks', () => {
  it('remplace les retours à la ligne simples par des sauts de ligne', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Lundi\nMardi' }] }],
    };

    remarkSoftBreaks()(tree);

    expect(tree.children[0]!.children).toEqual([
      { type: 'text', value: 'Lundi' },
      { type: 'break' },
      { type: 'text', value: 'Mardi' },
    ]);
  });

  it('laisse le texte sans retour à la ligne intact', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Une seule ligne' }] }],
    };

    remarkSoftBreaks()(tree);

    expect(tree.children[0]!.children).toEqual([{ type: 'text', value: 'Une seule ligne' }]);
  });
});
