import { cn } from '@/lib/utils';

type PageBleedProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * Forest (light) / Lime (dark) full-bleed band.
   * Uses `page-bleed-ink` — edge-to-edge within the shell content column.
   */
  ink?: boolean;
};

/**
 * Escapes the shell horizontal gutter so a section can touch the column edges.
 * Prefer `ink` for Seed dark-section moments (empty states, hub callouts).
 */
export function PageBleed({ children, className, ink = false }: PageBleedProps) {
  return <div className={cn(ink ? 'page-bleed-ink' : 'page-bleed', className)}>{children}</div>;
}
