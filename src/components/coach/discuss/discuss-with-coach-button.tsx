'use client';

import { MessageCircle } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { usePlannedSessionNavDismiss } from '@/components/planning/session/edit/planned-session-nav-dismiss';
import {
  coachDiscussHref,
  type CoachDiscussTarget,
} from '@/lib/coach/chat/discuss/coach-discuss-href';
import { useAppModalOptional } from '@/providers/app-modal-provider';
import { cn } from '@/lib/utils';

type ButtonVariant = VariantProps<typeof buttonVariants>;

/** Canonical athlete-facing label for every contextual Coach entry. */
export const COACH_DISCUSS_LABEL = 'Discuter avec le coach';

/** Canonical icon for every contextual Coach entry (MessageCircle). */
export const CoachDiscussIcon = MessageCircle;

type DiscussWithCoachButtonProps = {
  target: CoachDiscussTarget;
  className?: string;
  size?: ButtonVariant['size'];
  variant?: ButtonVariant['variant'];
  /** Called before navigating to Coach (e.g. close parent dialog). */
  onBeforeNavigate?: () => void;
};

/**
 * Shared entry point to start a coach chat with attached discuss context chip.
 * Does not prefill the composer — the athlete writes; context is the chip only.
 * Closes any open planned-session modal before navigating to Coach.
 */
export function DiscussWithCoachButton({
  target,
  className,
  size = 'default',
  variant = 'outline',
  onBeforeNavigate,
}: DiscussWithCoachButtonProps) {
  const dismissFromDialog = usePlannedSessionNavDismiss();
  const appModal = useAppModalOptional();

  return (
    <LinkButton
      href={coachDiscussHref(target)}
      size={size}
      variant={variant}
      className={cn(
        // Instrument radius from buttonVariants (rounded-lg) — never pill.
        // Wrap-safe on narrow mobile: allow multi-line label without nowrap fight.
        'h-auto min-h-8 self-start text-left whitespace-normal',
        className,
      )}
      onClick={() => {
        onBeforeNavigate?.();
        dismissFromDialog?.();
        appModal?.closePlannedSession();
      }}
    >
      <CoachDiscussIcon aria-hidden />
      {COACH_DISCUSS_LABEL}
    </LinkButton>
  );
}
