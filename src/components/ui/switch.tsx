'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5.5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'bg-muted p-0.5 transition-colors outline-none',
        'focus-visible:ring-ring/50 focus-visible:ring-3',
        'data-checked:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background pointer-events-none block size-4 rounded-full shadow-sm ring-0',
          'translate-x-0 transition-transform data-checked:translate-x-3.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
