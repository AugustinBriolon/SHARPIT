'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { ImageGenerationStatus } from './image-generation-types';

export function ImageGenerationShell({
  active,
  children,
  className,
  size,
  status,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
  size: 'compact' | 'fluid';
  status: ImageGenerationStatus;
}) {
  return (
    <div
      aria-busy={active}
      className={cn('w-full', className)}
      data-slot="image-generation"
      data-state={status}
    >
      <div className={cn('w-full', size === 'compact' && 'mx-auto max-w-52')}>{children}</div>
    </div>
  );
}
