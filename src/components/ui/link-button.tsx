import Link from 'next/link';
import { type VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LinkButtonProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    static?: boolean;
  };

export function LinkButton({
  className,
  variant,
  size,
  static: isStatic = false,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        buttonVariants({ variant, size }),
        !isStatic &&
          'motion-safe:duration-150 motion-safe:ease-out motion-safe:active:not-disabled:scale-[0.96]',
        className,
      )}
      {...props}
    />
  );
}
