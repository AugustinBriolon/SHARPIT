import type { HTMLMotionProps } from 'motion/react';
import { SPRING_LAYOUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

type MessageBubbleVariant = 'solid' | 'soft' | 'tint' | 'outline' | 'ghost' | 'danger';
type MessageBubbleAlign = 'start' | 'end';

export function bubbleExitAnimation(reduce: boolean, exit: HTMLMotionProps<'div'>['exit']) {
  if (exit !== undefined) {
    return exit;
  }
  if (reduce) {
    return { opacity: 0 };
  }
  return { opacity: 0, y: -3, scale: 0.99 };
}

export function bubbleTransition(
  reduce: boolean,
  transition: HTMLMotionProps<'div'>['transition'],
) {
  return transition ?? (reduce ? { duration: 0.12 } : SPRING_LAYOUT);
}

export function bubbleAlignClass(align: MessageBubbleAlign) {
  return align === 'end' ? 'items-end' : 'items-start';
}

export function bubbleContentClass(variant: MessageBubbleVariant, interactive: boolean) {
  return cn(
    'relative z-0 min-w-9 max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 text-foreground',
    '[&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-background/60 [&_pre]:p-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
    variant === 'solid' && 'text-background',
    variant === 'ghost' && 'w-full max-w-none rounded-none px-0 py-0',
    variant === 'danger' && 'text-destructive',
    interactive &&
      'cursor-pointer text-left outline-none transition-[background-color,color,transform] duration-150 hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]',
  );
}

export function bubbleSurfaceClass(variant: MessageBubbleVariant, align: MessageBubbleAlign) {
  return cn(
    'pointer-events-none absolute inset-0 -z-10 rounded-[inherit]',
    align === 'end' ? 'origin-bottom-right' : 'origin-bottom-left',
    variant === 'solid' && 'bg-foreground',
    variant === 'soft' && 'bg-muted',
    variant === 'tint' && 'bg-primary/10',
    variant === 'outline' && 'border border-border/70 bg-background',
    variant === 'danger' && 'bg-destructive/10',
  );
}
