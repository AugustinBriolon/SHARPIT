'use client';

import { Wrench } from 'lucide-react';
import type { ActivityType } from '@prisma/client';
import { resolveSessionAccessories } from '@/lib/planned-session/accessories/session-accessories';

export function SessionAccessoriesSection({
  type,
  title,
  description,
  accessories,
  strengthPrescription,
  bare = false,
}: {
  type: ActivityType;
  title?: string | null;
  description?: string | null;
  accessories?: unknown;
  strengthPrescription?: unknown;
  /** When true, omit the section title (parent already labels the disclosure). */
  bare?: boolean;
}) {
  const items = resolveSessionAccessories({
    type,
    title,
    description,
    accessories,
    strengthPrescription,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {bare ? null : (
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm font-medium">
          <Wrench className="size-3.5" aria-hidden />
          Accessoires
        </p>
      )}
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="text-foreground/90 border-analysis-border/50 rounded-md border px-2 py-1 text-xs"
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
