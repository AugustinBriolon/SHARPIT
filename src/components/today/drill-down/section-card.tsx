import { cn } from '@/lib/utils';

function sectionPaddingClass(padding: 'default' | 'none' | 'hero'): string {
  if (padding === 'none') return '';
  if (padding === 'hero') return 'px-4 py-6 sm:px-6 sm:py-8';
  return 'px-4 py-4 sm:px-5 sm:py-5';
}

/**
 * Evidence / coach surface.
 * Mobile: iOS grouped-inset radius; desktop: analysis panel.
 */
export function DrillDownSectionCard({
  children,
  className,
  padding = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'default' | 'none' | 'hero';
}) {
  const paddingClass = sectionPaddingClass(padding);

  return (
    <section
      className={cn(
        'analysis-panel sm:rounded-analysis-lg rounded-[1.25rem]',
        paddingClass,
        className,
      )}
    >
      {children}
    </section>
  );
}
