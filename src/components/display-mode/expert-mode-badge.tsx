'use client';

import Link from 'next/link';
import { Microscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { MOI_PERSONALIZATION_DENSITY_HASH, MOI_PERSONALIZATION_PATH } from '@/lib/moi/paths';
import { cn } from '@/lib/utils';

/**
 * Silent indicator that the current page shows technical detail the
 * essential reading would hide — links to the explanation page rather than
 * toggling directly, since turning it off here would also hide whatever the
 * athlete came to this page to read.
 */
export function ExpertModeBadge({ className }: { className?: string }) {
  const { isExpert, isResolved } = useDisplayMode();
  if (!isResolved || !isExpert) {
    return null;
  }

  return (
    <Badge
      render={<Link href={`${MOI_PERSONALIZATION_PATH}${MOI_PERSONALIZATION_DENSITY_HASH}`} />}
      variant="outline"
      className={cn(
        'border-primary/30 text-primary focus-visible:ring-ring shrink-0 focus-visible:ring-2 focus-visible:outline-hidden',
        className,
      )}
    >
      <Microscope aria-hidden />
      Mode Expert
    </Badge>
  );
}
