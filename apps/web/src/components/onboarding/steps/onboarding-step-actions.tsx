'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@sharpit/app/lib/utils';

/**
 * The two buttons every wizard step ends on. One definition, because five steps
 * had drifted into five geometries — `h-11`, `w-full sm:w-auto`, `sm:mr-auto`,
 * and nothing at all — and three labels for the same two actions.
 *
 * No height override: `Button` already carries `button-hit`, which gives coarse
 * pointers a 44px target without making the chrome taller (see its size doc).
 * Full width on a phone so the docked bar reads as one block; intrinsic width
 * from `sm`, where the bar is a right-aligned row.
 */
const ACTION_WIDTH = 'w-full sm:w-auto';

export function OnboardingContinueButton({
  disabled,
  onClick,
  className,
  children = 'Continuer',
  type = 'button',
  form,
}: {
  disabled?: boolean;
  /** Omit when the button submits a form via `type="submit"` + `form`. */
  onClick?: () => void | Promise<void>;
  className?: string;
  children?: React.ReactNode;
  type?: 'button' | 'submit';
  form?: string;
}) {
  return (
    <Button
      className={cn(ACTION_WIDTH, className)}
      disabled={disabled}
      form={form}
      type={type}
      onClick={onClick ? () => void onClick() : undefined}
    >
      {children}
    </Button>
  );
}

/** Left-aligned from `sm` so the forward action keeps the right edge. */
export function OnboardingSkipButton({
  disabled,
  onClick,
  className,
  children = 'Passer',
}: {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Button
      className={cn(ACTION_WIDTH, 'sm:mr-auto', className)}
      disabled={disabled}
      type="button"
      variant="ghost"
      onClick={() => void onClick()}
    >
      {children}
    </Button>
  );
}
