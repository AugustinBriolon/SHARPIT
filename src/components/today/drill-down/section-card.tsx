import { cn } from '@/lib/utils';

function sectionPaddingClass(padding: 'default' | 'none' | 'hero'): string {
  if (padding === 'none') return '';
  if (padding === 'hero') return 'px-6 py-8';
  return 'px-5 py-5';
}

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
        'dark:bg-card dark:ring-border rounded-3xl bg-white shadow-sm ring-1 ring-black/4',
        paddingClass,
        className,
      )}
    >
      {children}
    </section>
  );
}
