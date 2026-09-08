'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { activityTypeLabels } from '@/lib/format';
import type { BrickSiblingActivityLink } from '@/lib/planned-session/brick/brick-sessions';
import { TWIN_DRILL_DOWN } from '@/lib/today/navigation/today-twin-navigation';

/**
 * After a brick leg is realized, jump to the other completed leg(s)
 * linked by the same planned brickGroupId.
 */
export function ActivityBrickSiblingNav({ siblings }: { siblings: BrickSiblingActivityLink[] }) {
  if (siblings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Autres jambes du brick" className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide">Brick · suite</p>
      <ul className="space-y-2">
        {siblings.map((sibling) => (
          <li key={sibling.activityId}>
            <Link
              className="chip-surface-lg focus-visible:ring-primary/35 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:opacity-95 focus-visible:ring-2 focus-visible:outline-hidden"
              href={TWIN_DRILL_DOWN.activity(sibling.activityId)}
            >
              <ActivityTypeIndicator type={sibling.type} variant="code" />
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm font-medium">
                  {sibling.title}
                </span>
                <span className="text-muted-foreground text-xs">
                  {activityTypeLabels[sibling.type]} · autre jambe
                </span>
              </span>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
