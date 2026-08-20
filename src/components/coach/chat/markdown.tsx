'use client';

import { memo, useMemo } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  closeOpenMarkdown,
  remarkSoftBreaks,
  splitMarkdownBlocks,
} from '@/lib/coach/chat/markdown-render';
import { cn } from '@/lib/utils';

const REMARK_PLUGINS = [remarkGfm, remarkSoftBreaks];

/**
 * Les balises structurantes passent par des composants : le rendu reste lisible
 * et échappe à la guerre de spécificité entre variantes arbitraires.
 */
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-heading text-foreground text-base font-semibold tracking-[-0.015em]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading text-foreground text-[0.9375rem] font-semibold tracking-[-0.01em]">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="text-foreground text-sm font-semibold">{children}</h3>,
  h4: ({ children }) => (
    <h4 className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-muted-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h6>
  ),
  p: ({ children }) => <p className="text-pretty">{children}</p>,
  ul: ({ children }) => (
    <ul className="marker:text-muted-foreground/70 list-disc space-y-1 ps-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="marker:text-muted-foreground/70 list-decimal space-y-1 ps-5 marker:tabular-nums">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="[&:has(>input)]:-ms-5 [&:has(>input)]:list-none [&>ol]:mt-1 [&>p]:my-0 [&>p+p]:mt-2 [&>ul]:mt-1">
      {children}
    </li>
  ),
  input: ({ type, checked }) =>
    type === 'checkbox' ? (
      <input
        checked={checked}
        className="accent-primary me-2 size-3.5 translate-y-[0.15em] cursor-default opacity-100"
        type="checkbox"
        disabled
        readOnly
      />
    ) : null,
  a: ({ href, children }) => {
    const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href);
    return (
      <a
        className="text-primary decoration-primary/40 hover:decoration-primary [overflow-wrap:anywhere] underline underline-offset-2"
        href={href}
        rel={isExternal ? 'noreferrer noopener' : undefined}
        target={isExternal ? '_blank' : undefined}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-primary/40 text-muted-foreground space-y-2 border-s-2 ps-3">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-analysis-surface border-analysis-border rounded-analysis overflow-x-auto border p-3 text-xs [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="bg-analysis-surface border-analysis-border/60 font-data rounded-[4px] border px-1 py-0.5 text-[0.85em]">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="border-analysis-border rounded-analysis min-w-0 overflow-x-auto border">
      <table className="w-full min-w-[18rem] border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-analysis-surface">{children}</thead>,
  th: ({ children }) => (
    <th className="border-analysis-border/70 text-muted-foreground border-b px-2.5 py-2 text-left text-[0.6875rem] font-semibold tracking-[0.08em] break-words uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-analysis-border/50 border-t px-2.5 py-2 align-top break-words tabular-nums">
      {children}
    </td>
  ),
};

const RHYTHM = {
  default: cn(
    '[&>*]:mt-3',
    '[&>h1]:mt-5 [&>h2]:mt-5 [&>h3]:mt-4 [&>h4]:mt-4 [&>h5]:mt-4 [&>h6]:mt-4',
    '[&>hr]:my-4',
  ),
  compact: cn(
    '[&>*]:mt-2',
    '[&>h1]:mt-3.5 [&>h2]:mt-3.5 [&>h3]:mt-3 [&>h4]:mt-3 [&>h5]:mt-3 [&>h6]:mt-3',
    '[&>hr]:my-3',
  ),
} as const;

const PROSE = cn(
  '[&>*:first-child]:mt-0',
  '[&_strong]:text-foreground [&_strong]:font-semibold',
  '[&_em]:italic',
  '[&_del]:text-muted-foreground [&_del]:line-through',
  '[&_hr]:border-analysis-border/60',
  '[&_ul_ul]:list-[circle] [&_ol_ol]:list-[lower-alpha]',
  '[&_img]:rounded-analysis [&_img]:border-analysis-border [&_img]:border [&_img]:max-w-full',
  '[&_.footnotes]:border-analysis-border/60 [&_.footnotes]:text-muted-foreground [&_.footnotes]:mt-4 [&_.footnotes]:border-t [&_.footnotes]:pt-2 [&_.footnotes]:text-xs',
  '[&_sup_a]:no-underline',
);

const MarkdownBlock = memo(function MarkdownBlock({ source }: { source: string }) {
  return (
    <ReactMarkdown components={markdownComponents} remarkPlugins={REMARK_PLUGINS}>
      {source}
    </ReactMarkdown>
  );
});

/**
 * Rendu Markdown stylé pour les messages du coach.
 *
 * En streaming, le texte est refermé avant rendu (pas d'astérisques nues) et
 * découpé en blocs mémoïsés : seule la queue du flux est reparsée à chaque token.
 */
function MarkdownRenderer({
  children,
  variant = 'default',
  streaming = false,
}: {
  children: string;
  variant?: 'default' | 'compact';
  streaming?: boolean;
}) {
  const blocks = useMemo(
    () => splitMarkdownBlocks(streaming ? closeOpenMarkdown(children) : children),
    [children, streaming],
  );

  return (
    <div
      className={cn(
        'min-w-0 text-sm leading-relaxed break-words',
        RHYTHM[variant],
        PROSE,
        streaming && 'coach-streaming',
      )}
    >
      {blocks.map((block, index) => (
        <MarkdownBlock key={index} source={block} />
      ))}
    </div>
  );
}

export const Markdown = memo(MarkdownRenderer);
