'use client';

import { SECTIONS, type SectionId } from '@/components/progress/progress-hub-sections';
import { cn } from '@/lib/utils';

export function ProgressHubNav({
  section,
  onSelect,
}: {
  section: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      aria-label="Sections Progression"
      className="border-analysis-border/70 mt-4 flex gap-5 border-b"
    >
      {SECTIONS.map((item) => {
        const isActive = section === item.id;
        return (
          <button
            key={item.id}
            aria-current={isActive ? 'page' : undefined}
            type="button"
            className={cn(
              'pressable -mb-px min-h-11 border-b-2 px-0 text-sm lg:min-h-9',
              isActive
                ? 'border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
