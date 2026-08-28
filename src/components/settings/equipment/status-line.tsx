import type { ReactNode } from 'react';
import type { StrengthVenue } from '@/lib/equipment/catalog';

export function EquipmentStatusLine({
  error,
  message,
  saving: _saving,
  dirty,
}: {
  error: string | null;
  message: string | null;
  saving: boolean;
  dirty: boolean;
}) {
  let content: ReactNode = null;
  if (error) {
    content = <span className="text-destructive">{error}</span>;
  } else if (message) {
    content = <span>{message}</span>;
  } else if (dirty) {
    content = <span>Modifications en cours…</span>;
  }

  return (
    <div
      aria-live={error ? 'assertive' : 'polite'}
      className="text-muted-foreground flex min-h-5 items-center text-xs"
      role={error ? 'alert' : undefined}
    >
      {content}
    </div>
  );
}

/** Empty-state copy when STRENGTH has no checklist to show. */
export function strengthInventoryMessage(venue: StrengthVenue | null): string | null {
  if (venue === null) {
    return "Choisis d'abord un lieu: salle, maison, les deux, ou poids du corps.";
  }
  if (venue === 'gym') {
    return "Pas besoin d'inventaire salle : le coach part du matériel standard.";
  }
  if (venue === 'bodyweight') {
    return "Poids du corps: seul le lest portable (gilet, ceinture) peut s'ajouter.";
  }
  return null;
}
