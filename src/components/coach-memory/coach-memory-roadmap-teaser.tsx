import { Sparkles } from 'lucide-react';
import { PageBleed } from '@/components/layout/page-bleed';
import { COACH_MEMORY_FUTURE_TYPES } from '@/lib/coach-memory/types';

export function CoachMemoryRoadmapTeaser() {
  return (
    <PageBleed className="py-5" tone="muted">
      <div className="flex items-start gap-3">
        <div className="icon-well mt-0.5 size-8 shrink-0 rounded-lg">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label">À venir</p>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            D&apos;autres types de mémoire structurée arriveront prochainement pour enrichir le
            contexte du coach.
          </p>
          <ul className="mt-3 space-y-2">
            {COACH_MEMORY_FUTURE_TYPES.map((item) => (
              <li key={item.type} className="text-sm leading-relaxed">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground"> — {item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageBleed>
  );
}
