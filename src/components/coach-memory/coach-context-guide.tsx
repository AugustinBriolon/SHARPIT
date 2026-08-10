import { COACH_CONTEXT_GUIDE_AXES } from '@/lib/coach-memory/context-guide';

/**
 * What belongs in the free-text context.
 * Reference material, not page furniture: the caller decides when to reveal it,
 * so this owns no border, spacing or heading chrome of its own.
 */
export function CoachContextGuide({ id }: { id?: string }) {
  return (
    <div aria-label="Guide pour un bon contexte" id={id} role="note">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Le texte libre couvre déjà préférences et disponibilités. Un bon contexte touche ces quatre
        points — pas besoin de champs séparés.
      </p>
      <ul className="mt-3 space-y-2">
        {COACH_CONTEXT_GUIDE_AXES.map((axis) => (
          <li key={axis.id} className="text-sm leading-relaxed">
            <span className="font-medium">{axis.label}</span>
            <span className="text-muted-foreground"> — {axis.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
