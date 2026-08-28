'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useBackTarget } from '@/hooks/use-back-target';

function canUseHistoryBack(): boolean {
  if (typeof performance === 'undefined') {
    return false;
  }
  const entry = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  return entry?.type !== 'reload';
}

function ActivityDetailBackLinkInner() {
  const router = useRouter();
  const target = useBackTarget();
  const preferHistoryBack = target.fromStack && canUseHistoryBack();

  return (
    <Link
      className="text-muted-foreground hover:text-foreground inline-flex min-h-9 min-w-0 items-center gap-1 text-sm transition-colors"
      href={target.href}
      onClick={(event) => {
        if (!preferHistoryBack) {
          return;
        }
        event.preventDefault();
        router.back();
      }}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{target.label}</span>
    </Link>
  );
}

/** Inline back link for the activity detail header toolbar. */
export function ActivityDetailBackLink() {
  return (
    <Suspense
      fallback={
        <span className="text-muted-foreground inline-flex min-h-9 items-center text-sm">
          Retour
        </span>
      }
    >
      <ActivityDetailBackLinkInner />
    </Suspense>
  );
}
