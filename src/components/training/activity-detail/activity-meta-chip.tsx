import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { chipDot } from './activity-detail-helpers';
import type { ChipTone } from './types';
import Link from 'next/link';

export function ActivityMetaChip({
  href,
  icon: Icon,
  label,
  value,
  tone,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: ChipTone;
}) {
  return href ? (
    <Link
      className="border-primary/30 bg-muted/20 hover:border-primary/50 hover:bg-muted/50 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors"
      href={href}
    >
      {tone ? (
        <span className={cn('size-2 rounded-full', chipDot[tone])} />
      ) : (
        <Icon className="text-muted-foreground size-3.5" />
      )}
      <span className="text-muted-foreground font-medium tracking-wider uppercase">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </Link>
  ) : (
    <span className="border-border bg-card inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
      {tone ? (
        <span className={cn('size-2 rounded-full', chipDot[tone])} />
      ) : (
        <Icon className="text-muted-foreground size-3.5" />
      )}
      <span className="text-muted-foreground font-medium tracking-wider uppercase">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </span>
  );
}
