import { COACH_CONTEXT_GUIDE_AXES } from '@/lib/coach-memory/context-guide';

/** Remplace le teaser « à venir » — indique quoi mettre dans le contexte libre. */
export function CoachContextGuide() {
  return (
    <aside aria-label="Guide pour un bon contexte" className="border-analysis-border border-t pt-4">
      <p className="text-label">Bon contexte</p>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        Le texte libre couvre déjà préférences et disponibilités. Un bon contexte touche ces quatre
        points — pas besoin de champs séparés.
      </p>
      <ul className="mt-3 space-y-2.5">
        {COACH_CONTEXT_GUIDE_AXES.map((axis) => (
          <li key={axis.id} className="text-sm leading-relaxed">
            <span className="font-medium">{axis.label}</span>
            <span className="text-muted-foreground"> — {axis.hint}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
