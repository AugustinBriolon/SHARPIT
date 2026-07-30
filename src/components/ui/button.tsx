import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/** Press feedback — DESIGN_LANGUAGE §9 + better-ui scale-on-press (always 0.96). */
const tapScale =
  'motion-safe:active:not-disabled:not-aria-[haspopup]:scale-[0.96] motion-safe:duration-150 motion-safe:ease-out';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,transform] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Seed filled CTA — Forest on light, Snow on dark (ink), not leaf-green */
        default: 'bg-foreground text-background hover:bg-foreground/90',
        outline:
          'border-foreground/35 bg-background text-foreground hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground dark:border-foreground/40 dark:bg-transparent dark:hover:bg-foreground/10',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        /** Chromatic accent — leaf / Lime interactive, not the filled CTA */
        accent: 'bg-primary text-primary-foreground hover:bg-primary/85',
        /** Lime Pulse action pill — bande ink affordance (pressed = one ramp darker) */
        highlight:
          'bg-highlight text-highlight-foreground rounded-full font-semibold hover:bg-highlight/90 active:bg-[oklch(0.88_0.13_126.6)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        /**
         * Touch-first: 44px on mobile, denser instrument height from `lg`.
         * Same job → same size family; variants carry hierarchy, not height.
         */
        default:
          'h-11 gap-1.5 px-3 lg:h-9 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: "h-9 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs lg:h-6 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-11 gap-1.5 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] lg:h-8 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-12 gap-1.5 px-3.5 lg:h-10 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-11 lg:size-9',
        'icon-xs':
          "size-9 rounded-[min(var(--radius-md),10px)] lg:size-6 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-11 rounded-[min(var(--radius-md),12px)] lg:size-7 in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-12 lg:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  static: isStatic = false,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Disable press scale when motion would distract (e.g. dense toolbars). */
    static?: boolean;
  }) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size }), !isStatic && tapScale, className)}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
