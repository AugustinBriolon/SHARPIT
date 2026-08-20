export type CoachMetricItem = {
  label: string;
  value: string;
  subsection?: string;
};

export type CoachMessageBlock =
  | { type: 'prose'; content: string }
  | { type: 'phase'; title: string; metrics: CoachMetricItem[]; prose?: string }
  | { type: 'synthesis'; title: string; metrics: CoachMetricItem[]; prose?: string }
  | { type: 'conversation'; content: string };

const PHASE_TITLE = /^[A-Z](?:\.|\))\s+.+|^(?:vélo|course|natation|brick|run|bike)\b/i;
const SYNTHESIS_TITLE =
  /synthèse|conseil\s+elite|récapitulatif|récap\b|besoins\s+totaux|en\s+résumé/i;
const SUBSECTION_LINE = /^\*\*([^*]+)\*\*\s*$/;
const METRIC_LINE = /^(?:[-*•]|\d+\.)\s*(?:\*\*)?([^*:\n]+?)(?:\*\*)?\s*:\s*(.+)$/;
const METRIC_INLINE = /^(?:\*\*)?([^*:\n]+?)(?:\*\*)?\s*:\s*(.+)$/;
const VALUE_ONLY_LINE = /^(?:[-*•]|\d+\.)\s+(.+)$/;

const CONVERSATION_START =
  /^(?:veux-tu|souhaites-tu|puis-je|dois-je|dis-moi|n'hésite|on peut|je peux|tu veux|souhaites|veux)/i;

function normalizeHeader(line: string): string | null {
  const trimmed = line.trim();
  const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
  if (heading) return heading[1]!.replace(/\*\*/g, '').trim();
  const bold = trimmed.match(/^\*\*(.+)\*\*\s*$/);
  if (bold) return bold[1]!.trim();
  if (PHASE_TITLE.test(trimmed)) return trimmed.replace(/\*\*/g, '').trim();
  if (SYNTHESIS_TITLE.test(trimmed)) return trimmed.replace(/\*\*/g, '').trim();
  return null;
}

function isConversationalParagraph(paragraph: string): boolean {
  const text = paragraph.trim();
  if (!text) return false;
  if (text.endsWith('?')) return true;
  return CONVERSATION_START.test(text);
}

export function splitConversationTail(content: string): {
  body: string;
  conversation: string | null;
} {
  const paragraphs = content.trim().split(/\n{2,}/);
  const tail: string[] = [];

  while (paragraphs.length > 0) {
    const last = paragraphs[paragraphs.length - 1]!;
    if (!isConversationalParagraph(last)) break;
    tail.unshift(last);
    paragraphs.pop();
    if (tail.length >= 2) break;
  }

  return {
    body: paragraphs.join('\n\n').trim(),
    conversation: tail.length > 0 ? tail.join('\n\n').trim() : null,
  };
}

type RawSection = {
  title: string | null;
  lines: string[];
};

export function splitIntoSections(body: string): RawSection[] {
  if (!body.trim()) return [];

  const lines = body.split('\n');
  const sections: RawSection[] = [];
  let current: RawSection = { title: null, lines: [] };

  function pushCurrent() {
    if (current.title || current.lines.some((l) => l.trim())) {
      sections.push(current);
    }
    current = { title: null, lines: [] };
  }

  for (const line of lines) {
    const header = normalizeHeader(line);
    if (
      header &&
      (PHASE_TITLE.test(header) || SYNTHESIS_TITLE.test(header) || line.startsWith('#'))
    ) {
      pushCurrent();
      current = { title: header, lines: [] };
      continue;
    }
    current.lines.push(line);
  }

  pushCurrent();
  return sections;
}

function looksLikeMarkdownProse(line: string): boolean {
  const trimmed = line.trim();
  if (/^\*\*/.test(trimmed) && !/^\*\*[^*]+\*\*\s*$/.test(trimmed)) return true;
  if (/^(?:[-*•]|\d+\.)\s+\*\*/.test(trimmed)) return true;
  return false;
}

function parseMetrics(lines: string[]): { metrics: CoachMetricItem[]; proseLines: string[] } {
  const metrics: CoachMetricItem[] = [];
  const proseLines: string[] = [];
  let subsection: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      proseLines.push('');
      continue;
    }

    if (looksLikeMarkdownProse(line)) {
      proseLines.push(rawLine);
      continue;
    }

    const sub = line.match(SUBSECTION_LINE);
    if (sub) {
      subsection = sub[1]!.trim();
      continue;
    }

    const listMetric = line.match(METRIC_LINE);
    if (listMetric) {
      metrics.push({
        label: listMetric[1]!.trim(),
        value: listMetric[2]!.trim(),
        subsection,
      });
      continue;
    }

    const inlineMetric = line.match(METRIC_INLINE);
    if (inlineMetric && /\d/.test(inlineMetric[2]!)) {
      metrics.push({
        label: inlineMetric[1]!.trim(),
        value: inlineMetric[2]!.trim(),
        subsection,
      });
      continue;
    }

    const valueOnly = line.match(VALUE_ONLY_LINE);
    if (valueOnly && /\d/.test(valueOnly[1]!) && !valueOnly[1]!.includes('**')) {
      metrics.push({
        label: subsection ?? 'Recommandation',
        value: valueOnly[1]!.trim(),
        subsection,
      });
      continue;
    }

    proseLines.push(rawLine);
  }

  return { metrics, proseLines };
}

function classifySection(section: RawSection): CoachMessageBlock {
  const { title, lines } = section;

  if (!title) {
    const { metrics, proseLines } = parseMetrics(lines);
    const content = proseLines.join('\n').trim();
    if (metrics.length >= 2) {
      return { type: 'phase', title: 'Plan', metrics, prose: content || undefined };
    }
    return { type: 'prose', content };
  }

  const { metrics, proseLines } = parseMetrics(lines);
  const leftover = proseLines.join('\n').trim();

  if (SYNTHESIS_TITLE.test(title)) {
    return { type: 'synthesis', title, metrics, prose: leftover || undefined };
  }

  if (PHASE_TITLE.test(title) || metrics.length > 0) {
    return { type: 'phase', title, metrics, prose: leftover || undefined };
  }

  return {
    type: 'prose',
    content: `**${title}**\n\n${lines.join('\n').trim()}`.trim(),
  };
}

export function parseCoachMessage(raw: string): CoachMessageBlock[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const { body, conversation } = splitConversationTail(trimmed);
  const blocks: CoachMessageBlock[] = [];

  if (body) {
    const sections = splitIntoSections(body);
    if (sections.length === 0) {
      blocks.push({ type: 'prose', content: body });
    } else {
      for (const section of sections) {
        blocks.push(classifySection(section));
      }
    }
  }

  if (conversation) {
    blocks.push({ type: 'conversation', content: conversation });
  }

  const structuredCount = blocks.filter(
    (b) => b.type !== 'prose' && b.type !== 'conversation',
  ).length;
  if (structuredCount === 0 && blocks.length <= 1) {
    return [{ type: 'prose', content: trimmed }];
  }

  return blocks;
}
