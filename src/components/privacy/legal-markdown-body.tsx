'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const components: Components = {
  h2: ({ children }) => <h2 className="text-page-title sr-only">{children}</h2>,
  h3: ({ children }) => <h3 className="text-section-title mt-8 first:mt-0">{children}</h3>,
  p: ({ children }) => (
    <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-pretty">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="text-muted-foreground mt-3 list-disc space-y-1 ps-5 text-sm leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-muted-foreground mt-3 list-decimal space-y-1 ps-5 text-sm leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-pretty">{children}</li>,
  strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
  a: ({ href, children }) => (
    <a
      className="text-foreground underline underline-offset-2"
      href={href}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
      target={href?.startsWith('http') ? '_blank' : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-border text-foreground mt-4 border-l-2 pl-4 text-sm leading-relaxed">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="text-label">{children}</thead>,
  th: ({ children }) => (
    <th className="border-border text-muted-foreground border-b px-2 py-2 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-border text-muted-foreground border-b px-2 py-2 align-top">{children}</td>
  ),
  hr: () => <hr className="border-border my-8" />,
};

/** Renders Privacy Santé FR drafts (`docs/legal/*_PAGE_FR_V0.md`) with SHARPIT typography. */
export function LegalMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="legal-markdown space-y-1">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
