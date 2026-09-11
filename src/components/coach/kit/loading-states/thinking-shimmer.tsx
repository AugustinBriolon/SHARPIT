import type { ReactNode } from 'react';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { cn } from '@/lib/utils';

export interface ThinkingShimmerProps {
  /** Loading message shown to the user. */
  children?: ReactNode;
  /** Seconds taken for one shimmer pass. */
  duration?: number;
  className?: string;
}

export function ThinkingShimmer({
  children = 'Thinking…',
  duration = 1.8,
  className,
}: ThinkingShimmerProps) {
  return (
    <TextShimmer as="span" className={cn('font-medium', className)} duration={duration}>
      {children}
    </TextShimmer>
  );
}
