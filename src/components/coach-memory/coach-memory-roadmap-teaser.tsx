import { Sparkles } from 'lucide-react';
import { PageBleed } from '@/components/layout/page-bleed';
import { COACH_MEMORY_FUTURE_TYPES } from '@/lib/coach-memory/types';

export function CoachMemoryRoadmapTeaser() {
  return (
    <PageBleed className="py-4" ink>
      <div className="flex items-start gap-3">
        <div className="icon-well mt-0.5 size-8 rounded-lg">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label text-ink-surface-foreground/70">À venir</p>
          <p className="text-ink-surface-foreground/85 mt-1.5 text-sm leading-relaxed">
            D&apos;autres types de mémoire structurée arriveront prochainement pour enrichir le
            contexte du coach.
          </p>
          <ul className="mt-3 space-y-2">
            {COACH_MEMORY_FUTURE_TYPES.map((item) => (
              <li key={item.type} className="text-sm">
                <span className="text-ink-surface-foreground font-medium">{item.label}</span>
                <span className="text-ink-surface-foreground/70"> — {item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageBleed>
  );
}
