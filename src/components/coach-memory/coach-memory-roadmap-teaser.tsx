import { Sparkles } from 'lucide-react';
import { COACH_MEMORY_FUTURE_TYPES } from '@/lib/coach-memory/types';

export function CoachMemoryRoadmapTeaser() {
  return (
    <section className="border-muted-foreground/20 bg-muted/20 rounded-analysis-lg border border-dashed px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="bg-muted/60 text-muted-foreground/70 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label">À venir</p>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            D&apos;autres types de mémoire structurée arriveront prochainement pour enrichir le
            contexte du coach.
          </p>
          <ul className="mt-3 space-y-2">
            {COACH_MEMORY_FUTURE_TYPES.map((item) => (
              <li key={item.type} className="text-sm">
                <span className="text-foreground/80 font-medium">{item.label}</span>
                <span className="text-muted-foreground"> — {item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
