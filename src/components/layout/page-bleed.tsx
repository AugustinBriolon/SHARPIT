import { cn } from '@/lib/utils';

type PageBleedProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * Visual tone for the edge-to-edge band.
   * - `plain` — gutter break only (no fill)
   * - `muted` — soft analysis plate, full-bleed (default callouts)
   * - `ink` — Seed dark band (rare hub moments only)
   */
  tone?: 'plain' | 'muted' | 'ink';
  /**
   * @deprecated Use `tone="ink"` instead.
   */
  ink?: boolean;
};

const TONE_CLASS: Record<NonNullable<PageBleedProps['tone']>, string> = {
  plain: 'page-bleed',
  muted: 'page-bleed-muted',
  ink: 'page-bleed-ink',
};

/**
 * Escapes the shell horizontal gutter so a section can touch the column edges.
 * Prefer `tone="muted"` for settings / secondary callouts. Reserve `ink` for
 * intentional hub empty states — not everyday cards.
 */
export function PageBleed({ children, className, tone, ink = false }: PageBleedProps) {
  const resolved: NonNullable<PageBleedProps['tone']> = tone ?? (ink ? 'ink' : 'plain');
  return <div className={cn(TONE_CLASS[resolved], className)}>{children}</div>;
}
