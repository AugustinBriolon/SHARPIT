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
    <section className={cn('analysis-panel rounded-analysis-lg', paddingClass, className)}>
      {children}
    </section>
  );
}
