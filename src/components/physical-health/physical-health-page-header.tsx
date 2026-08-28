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
        description="État inféré à partir de tes observations — symptômes et capacité fonctionnelle sont distincts."
        label="Progression"
        title="Santé physique"
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Conditions actives, capacité d&apos;entraînement et évolution inférées.
      </p>
      {headerAction}
    </div>
  );
}
