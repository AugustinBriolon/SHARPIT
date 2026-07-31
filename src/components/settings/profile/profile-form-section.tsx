import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ProfileFormSection({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        'border-analysis-border/60 rounded-analysis border',
        compact ? 'space-y-2.5 px-3 py-3' : 'space-y-4 px-4 py-4',
      )}
    >
      <div>
        <h3 className={cn('text-section-title', compact && 'text-sm')}>{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
