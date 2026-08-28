'use client';

import { Info, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CoachProfileContextHeader({
  guideId,
  guideOpen,
  loadError,
  loading,
  mode,
  onEdit,
  onToggleGuide,
}: {
  guideId: string;
  guideOpen: boolean;
  loadError: string | null;
  loading: boolean;
  mode: 'read' | 'edit';
  onEdit: () => void;
  onToggleGuide: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="text-label text-primary mb-1">Durable</p>
        <h2 className="text-section-title">Préférences & disponibilités</h2>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-controls={guideId}
          aria-expanded={guideOpen}
          aria-label="Qu'est-ce qu'un bon contexte ?"
          className="text-muted-foreground"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onToggleGuide}
        >
          <Info className="size-4" aria-hidden />
        </Button>
        {!loadError && !loading && mode === 'read' ? (
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden />
            Modifier
          </Button>
        ) : null}
      </div>
    </div>
  );
}
