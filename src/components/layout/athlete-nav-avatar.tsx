import { cn } from '@/lib/utils';

/**
 * Initials pastille for primary nav — brand circle, no Clerk photo.
 * Sizes match the Lucide icons they replace (mobile ~20px, desktop ~32px).
 */
export function AthleteNavAvatar({
  initials,
  size = 'sm',
  className,
}: {
  initials: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-primary/15 text-primary relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight',
        size === 'sm' && 'size-5 text-[9px]',
        size === 'md' && 'size-8 text-xs',
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AthleteNavAvatarSkeleton({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'bg-muted/60 animate-pulse rounded-full',
        size === 'sm' && 'size-5',
        size === 'md' && 'size-8',
        className,
      )}
      aria-hidden
    />
  );
}
