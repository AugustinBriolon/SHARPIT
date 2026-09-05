import Link from 'next/link';
import { type VariantProps } from 'class-variance-authority';
import { buttonTapScale, buttonVariants } from '@/components/ui/button';
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
      className={cn(buttonVariants({ variant, size }), !isStatic && buttonTapScale, className)}
      {...props}
    />
  );
}
