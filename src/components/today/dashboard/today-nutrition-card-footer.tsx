'use client';

import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

export function NutritionMacroSkeleton() {
  return (
    <div className="border-border/50 grid grid-cols-3 gap-2.5 border-t pt-2.5">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-6" />
          <SkeletonDataValue heightClassName="h-5" widthClassName="w-10" />
          <div className="bg-muted h-1 w-full animate-pulse rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function NutritionFooterLink({ label }: { label: string }) {
  return (
    <div className="border-border/50 flex items-end justify-between gap-3 border-t pt-2.5">
      <p className="text-muted-foreground text-xs leading-snug">{label}</p>
      <span className="text-primary text-xs font-medium">→</span>
    </div>
  );
}
