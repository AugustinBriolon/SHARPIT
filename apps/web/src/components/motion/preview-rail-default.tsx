'use client';

import type { ReactNode } from 'react';
import type { PreviewRailItem } from './preview-rail';

export function DefaultPreview({ item }: { item: PreviewRailItem }) {
  return (
    <div
      className="border-border bg-card rounded-2xl border p-4 shadow-sm"
      data-slot="preview-rail-card"
    >
      <p className="text-card-foreground font-medium" data-slot="preview-rail-title">
        {item.label}
      </p>
      {item.description ? (
        <div
          className="text-muted-foreground mt-1 text-sm leading-6"
          data-slot="preview-rail-description"
        >
          {item.description as ReactNode}
        </div>
      ) : null}
    </div>
  );
}
