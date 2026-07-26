'use client';

import { Wrench } from 'lucide-react';
import type { ActivityType } from '@prisma/client';
import { resolveSessionAccessories } from '@/lib/planned-session/session-accessories';

export function SessionAccessoriesSection({
  type,
  title,
  description,
  accessories,
  strengthPrescription,
}: {
  type: ActivityType;
  title?: string | null;
  description?: string | null;
  accessories?: unknown;
  strengthPrescription?: unknown;
}) {
  const items = resolveSessionAccessories({
    type,
    title,
    description,
    accessories,
    strengthPrescription,
  });

  if (items.length === 0) return null;

  return (
    <div className="border-analysis-border/60 space-y-2 rounded-lg border p-3">
      <p className="text-foreground/85 inline-flex items-center gap-1.5 text-sm font-medium">
        <Wrench className="text-muted-foreground size-3.5" />
        Accessoires nécessaires
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-analysis-border/60 bg-analysis-surface-alt/50 text-foreground/90 rounded-full border px-2.5 py-1 text-xs"
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
