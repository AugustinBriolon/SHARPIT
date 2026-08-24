'use client';

import Link from 'next/link';
import { Microscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { cn } from '@/lib/utils';

/**
 * Silent indicator that the current page shows technical detail the
 * essential reading would hide — links to the explanation page rather than
 * toggling directly, since turning it off here would also hide whatever the
 * athlete came to this page to read.
 */
export function ExpertModeBadge({ className }: { className?: string }) {
  const { isExpert, isResolved } = useDisplayMode();
  if (!isResolved || !isExpert) return null;

  return (
    <Badge
      className={cn('border-primary/30 text-primary shrink-0', className)}
      render={<Link href="/settings/appearance/expert-mode" />}
      variant="outline"
    >
      <Microscope aria-hidden />
      Mode Expert
    </Badge>
  );
}
