'use client';

import { MessageCircle } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { usePlannedSessionNavDismiss } from '@/components/planning/session/edit/planned-session-nav-dismiss';
import { coachDiscussHref, type CoachDiscussTarget } from '@/lib/coach/chat/coach-discuss-href';
import { useAppModalOptional } from '@/providers/app-modal-provider';
import { cn } from '@/lib/utils';

type ButtonVariant = VariantProps<typeof buttonVariants>;

type DiscussWithCoachButtonProps = {
  target: CoachDiscussTarget;
  label?: string;
  className?: string;
  size?: ButtonVariant['size'];
  variant?: ButtonVariant['variant'];
  /** Called before navigating to Coach (e.g. close parent dialog). */
  onBeforeNavigate?: () => void;
};

/**
 * Shared entry point to start a coach chat with attached discuss context.
 * Closes any open planned-session modal before navigating to Coach.
 */
export function DiscussWithCoachButton({
  target,
  label = 'Discuter avec le coach',
  className,
  size = 'default',
  variant = 'outline',
  onBeforeNavigate,
}: DiscussWithCoachButtonProps) {
  const dismissFromDialog = usePlannedSessionNavDismiss();
  const appModal = useAppModalOptional();

  return (
    <LinkButton
      className={cn('self-start', className)}
      href={coachDiscussHref(target)}
      size={size}
      variant={variant}
      onClick={() => {
        onBeforeNavigate?.();
        dismissFromDialog?.();
        appModal?.closePlannedSession();
      }}
    >
      <MessageCircle aria-hidden />
      {label}
    </LinkButton>
  );
}
