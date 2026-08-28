/**
 * Helpers de rendu Markdown pour les messages du coach.
 *
 * Trois problèmes distincts, trois fonctions :
 * - `closeOpenMarkdown` : pendant le streaming, le texte arrive coupé au milieu
 *   d'un `**`, d'un backtick ou d'un lien. Rendu tel quel, l'athlète voit des
 *   astérisques nues qui se transforment en gras une frame plus tard.
 * - `splitMarkdownBlocks` : react-markdown reparse la chaîne entière à chaque
 *   token. Découper en blocs stables permet de mémoïser tout ce qui précède la
 *   queue du flux.
 * - `remarkSoftBreaks` : les LLM écrivent des retours à la ligne simples en
 *   attendant un saut de ligne, pas une concaténation (comportement ChatGPT /
 *   Claude). CommonMark les traite comme une espace.
 */

const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})/;
const LIST_ITEM = /^\s{0,3}(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;

/** Définitions de liens et notes de bas de page : elles ne résolvent que si la référence et la définition partagent le même arbre. */
const CROSS_BLOCK_REFERENCE = /^\s{0,3}\[[^\]\n]+\]:\s|\[\^/m;

type BlockKind = 'list' | 'quote' | 'other';

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

function fenceMarker(line: string): string | null {
  return line.match(FENCE_OPEN)?.[1] ?? null;
}

function closesFence(line: string, open: string): boolean {
  const marker = fenceMarker(line);
  return marker !== null && marker[0] === open[0] && marker.length >= open.length;
}

function lineKind(line: string): BlockKind {
  if (LIST_ITEM.test(line)) {
    return 'list';
  }
  if (/^\s{0,3}>/.test(line)) {
    return 'quote';
  }
  return 'other';
}

/** Une ligne qui prolonge le bloc courant par-dessus une ligne vide (item de liste espacé, citation multi-paragraphes). */
function continuesBlock(kind: BlockKind, line: string): boolean {
  if (kind === 'list') {
    return LIST_ITEM.test(line) || /^\s{2,}\S/.test(line);
  }
  if (kind === 'quote') {
    return /^\s{0,3}>/.test(line);
  }
  return false;
}

function nextContentLine(lines: string[], from: number): string | null {
  for (let index = from; index < lines.length; index += 1) {
    if (lines[index]!.trim() !== '') {
      return lines[index]!;
    }
  }
  return null;
}

/**
 * Découpe le Markdown en blocs de premier niveau dont la concaténation rend à
 * l'identique. Les listes espacées, les citations et les blocs de code restent
 * entiers : couper une liste en deux relancerait la numérotation.
 */
function findUnclosedFence(source: string): string | null {
  let openFence: string | null = null;
  for (const line of source.split('\n')) {
    const marker = fenceMarker(line);
    if (marker === null) {
      continue;
    }
    if (openFence === null) {
      openFence = marker;
    } else if (marker[0] === openFence[0] && marker.length >= openFence.length) {
      openFence = null;
    }
  }
  return openFence;
}

function closeInlineMarkdownTokens(text: string): string {
  let cleaned = text.replace(/!?\[[^\]\n]*\]\([^)\n]*$/, '').replace(/!?\[[^\]\n]*$/, '');
  const lastLine = cleaned.slice(cleaned.lastIndexOf('\n') + 1);
  if ((lastLine.match(/`/g)?.length ?? 0) % 2 === 1) {
    cleaned += '`';
  }
  if ((cleaned.match(/\*\*/g)?.length ?? 0) % 2 === 1) {
    cleaned += '**';
  }
  return cleaned;
}

function processMarkdownBlankLine(input: {
  lines: string[];
  index: number;
  kind: BlockKind;
  flush: () => void;
  buffer: string[];
}): boolean {
  const next = nextContentLine(input.lines, input.index + 1);
  if (next === null) {
    return true;
  }
  if (continuesBlock(input.kind, next)) {
    input.buffer.push('');
    return false;
  }
  input.flush();
  return false;
}

function appendMarkdownLine(input: {
  line: string;
  openFence: string | null;
  buffer: string[];
  kind: BlockKind;
}): { openFence: string | null; kind: BlockKind } {
  if (input.openFence !== null) {
    input.buffer.push(input.line);
    const marker = fenceMarker(input.line);
    if (marker && closesFence(input.line, input.openFence)) {
      return { openFence: null, kind: input.kind };
    }
    return { openFence: input.openFence, kind: input.kind };
  }

  let { kind } = input;
  if (input.buffer.length === 0) {
    kind = lineKind(input.line);
  }
  input.buffer.push(input.line);
  return { openFence: fenceMarker(input.line), kind };
}

export function splitMarkdownBlocks(source: string): string[] {
  const trimmed = source.trim();
  if (!trimmed) {
    return [];
  }
  if (CROSS_BLOCK_REFERENCE.test(trimmed)) {
    return [trimmed];
  }

  const lines = trimmed.split('\n');
  const blocks: string[] = [];
  let buffer: string[] = [];
  let kind: BlockKind = 'other';
  let openFence: string | null = null;

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text) {
      blocks.push(text);
    }
    buffer = [];
    kind = 'other';
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    if (openFence !== null) {
      ({ openFence, kind } = appendMarkdownLine({ line, openFence, buffer, kind }));
      continue;
    }

    if (line.trim() === '') {
      if (processMarkdownBlankLine({ lines, index, kind, flush, buffer })) {
        break;
      }
      continue;
    }

    ({ openFence, kind } = appendMarkdownLine({ line, openFence, buffer, kind }));
  }

  flush();
  return blocks;
}

/**
 * Referme les marqueurs laissés ouverts par un flux coupé en plein token, et
 * masque un lien encore incomplet plutôt que d'afficher sa syntaxe brute.
 */
export function closeOpenMarkdown(source: string): string {
  if (!source) {
    return source;
  }

  const openFence = findUnclosedFence(source);
  if (openFence !== null) {
    return `${source}${source.endsWith('\n') ? '' : '\n'}${openFence}`;
  }

  return closeInlineMarkdownTokens(source);
}

/**
 * Transforme les retours à la ligne simples en sauts de ligne réels.
 * CommonMark les rend comme une espace ; les modèles, eux, écrivent une ligne
 * par idée et comptent dessus.
 */
export function remarkSoftBreaks() {
  return (tree: MarkdownNode) => {
    const walk = (node: MarkdownNode) => {
      if (!node.children) {
        return;
      }
      const rewritten: MarkdownNode[] = [];
      for (const child of node.children) {
        if (child.type === 'text' && child.value?.includes('\n')) {
          const segments = child.value.split('\n');
          segments.forEach((segment, index) => {
            if (index > 0) {
              rewritten.push({ type: 'break' });
            }
            if (segment) {
              rewritten.push({ type: 'text', value: segment });
            }
          });
          continue;
        }
        walk(child);
        rewritten.push(child);
      }
      node.children = rewritten;
    };
    walk(tree);
  };
}
