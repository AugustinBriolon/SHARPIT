'use client';

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const markdownComponents: Components = {
  table: ({ children }) => (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[20rem] text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-border/60 break-words border px-1.5 py-1.5 text-left sm:px-2 sm:py-2">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-border/60 break-words border px-1.5 py-1.5 sm:px-2 sm:py-2">{children}</td>
  ),
};

/** Rendu Markdown stylé pour les messages du coach. */
export function Markdown({
  children,
  variant = 'default',
}: {
  children: string;
  variant?: 'default' | 'compact';
}) {
  return (
    <div
      className={cn(
        'min-w-0 text-sm leading-relaxed',
        variant === 'compact' ? 'space-y-1.5' : 'space-y-2',
        '[&_h1]:font-heading [&_h1]:mt-1 [&_h1]:text-lg [&_h1]:font-semibold',
        '[&_h2]:font-heading [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium',
        '[&_p]:leading-relaxed',
        '[&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1',
        '[&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1',
        '[&_li]:marker:text-muted-foreground',
        '[&_strong]:text-foreground [&_strong]:font-semibold',
        '[&_em]:italic',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        '[&_code]:bg-muted/60 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
        '[&_pre]:bg-muted/60 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3',
        '[&_blockquote]:border-analysis-border [&_blockquote]:bg-analysis-surface-alt/50 [&_blockquote]:text-muted-foreground [&_blockquote]:rounded-analysis [&_blockquote]:border [&_blockquote]:px-3 [&_blockquote]:py-2',
        '[&_hr]:border-border/60 [&_hr]:my-3',
      )}
    >
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
