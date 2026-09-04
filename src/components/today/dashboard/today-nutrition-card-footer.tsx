'use client';

import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

export function NutritionMacroSkeleton() {
  return (
    <div className="border-border/50 grid grid-cols-3 gap-2 border-t pt-3.5">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="bg-muted size-14 animate-pulse rounded-full" />
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-14" />
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-10" />
        </div>
      ))}
    </div>
  );
}

export function NutritionFooterLink({ label }: { label: string }) {
  return (
    <div className="border-border/50 mt-3 flex items-end justify-between gap-3 border-t pt-3">
      <p className="text-muted-foreground text-xs leading-snug">{label}</p>
      <span className="text-primary text-xs font-medium">→</span>
    </div>
  );
}
