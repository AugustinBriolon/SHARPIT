import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

type NavArrowProps = SVGProps<SVGSVGElement> & {
  /** Default 1.25 — thinner than Lucide’s 2. */
  strokeWidth?: number;
};

/**
 * Minimal nav chevron — instrument chrome (back, next, row affordance).
 * Prefer these over Lucide `Chevron*` / fat `Arrow*` for directional UI.
 * Trajectory signals (↗ → ↘) stay Unicode per DESIGN_LANGUAGE §11.2.
 */
export function NavArrowLeft({ className, strokeWidth = 1.25, ...rest }: NavArrowProps) {
  return (
    <svg
      className={cn('shrink-0', className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...rest}
    >
      <path
        d="M14.25 5.25 7.5 12l6.75 6.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

export function NavArrowRight({ className, strokeWidth = 1.25, ...rest }: NavArrowProps) {
  return (
    <svg
      className={cn('shrink-0', className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...rest}
    >
      <path
        d="M9.75 5.25 16.5 12l-6.75 6.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

/** Disclosure / expand — same stroke family as nav arrows. */
export function NavArrowDown({ className, strokeWidth = 1.25, ...rest }: NavArrowProps) {
  return (
    <svg
      className={cn('shrink-0', className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...rest}
    >
      <path
        d="M5.25 9.75 12 16.5l6.75-6.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

export function NavArrowUp({ className, strokeWidth = 1.25, ...rest }: NavArrowProps) {
  return (
    <svg
      className={cn('shrink-0', className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...rest}
    >
      <path
        d="M5.25 14.25 12 7.5l6.75 6.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
