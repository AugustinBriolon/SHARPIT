'use client';

import { CorpsSectionHeader } from '@/components/corps/corps-ui';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PhysicalHealthPageHeader({
  embedded,
  loading,
  onCreate,
}: {
  embedded: boolean;
  loading: boolean;
  onCreate: () => void;
}) {
  const headerAction = (
    <Button
      className="min-h-11 px-4 lg:min-h-9 lg:px-3.5"
      disabled={loading}
      size="sm"
      variant="highlight"
      onClick={onCreate}
    >
      <Plus className="size-4" />
      Nouvelle condition
    </Button>
  );

  if (!embedded) {
    return (
      <CorpsSectionHeader
        action={headerAction}
        description="État inféré à partir de tes observations. Symptômes et capacité fonctionnelle sont distincts."
        label="Progression"
        title="Santé physique"
      />
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="text-section-title">Suivi</h2>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          Capacité d&apos;entraînement et conditions actives.
        </p>
      </div>
      {headerAction}
    </div>
  );
}
