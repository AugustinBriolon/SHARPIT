'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/** Rendu Markdown stylé pour les messages du coach. */
export function Markdown({ children }: { children: string }) {
  return (
    <div
      className={cn(
        'space-y-2 text-sm leading-relaxed',
        '[&_h1]:font-heading [&_h1]:mt-1 [&_h1]:text-lg [&_h1]:font-semibold',
        '[&_h2]:font-heading [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold',
        '[&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:font-medium',
        '[&_p]:leading-relaxed',
        '[&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1',
        '[&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1',
        '[&_li]:marker:text-muted-foreground',
        '[&_strong]:text-foreground [&_strong]:font-semibold',
        '[&_em]:italic',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
        '[&_code]:bg-muted/60 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
        '[&_pre]:bg-muted/60 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-3',
        '[&_blockquote]:border-primary/40 [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-3',
        '[&_th]:border-border/60 [&_td]:border-border/60 [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
        '[&_hr]:border-border/60 [&_hr]:my-3',
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
