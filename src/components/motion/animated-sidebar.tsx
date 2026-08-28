'use client';

import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import { type ButtonHTMLAttributes, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { SharedLayoutBg } from '@/components/motion/shared-layout-bg';
import { SPRING_LAYOUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { useAnimatedSidebar, useAnimatedSidebarPanel } from './animated-sidebar-context';
import { DesktopAnimatedSidebar, type AnimatedSidebarProps } from './animated-sidebar-desktop';
import { MobileSidebar } from './animated-sidebar-mobile';
import { mergeRefs, SUBMENU_ITEM_VARIANTS, SUBMENU_VARIANTS } from './animated-sidebar-shared';

export { AnimatedSidebarProvider, useAnimatedSidebar } from './animated-sidebar-context';
export type { AnimatedSidebarProviderProps } from './animated-sidebar-context';
export { AnimatedSidebarMenuButton, AnimatedSidebarMenuSubButton } from './animated-sidebar-menu';
export type {
  AnimatedSidebarMenuButtonProps,
  AnimatedSidebarMenuSubButtonProps,
} from './animated-sidebar-menu';

export const AnimatedSidebar = forwardRef<HTMLElement, AnimatedSidebarProps>(
  function AnimatedSidebar(
    { ariaLabel = 'Sidebar', side = 'left', className, children, ...props },
    forwardedRef,
  ) {
    const context = useAnimatedSidebar();
    if (context.isMobile) {
      return (
        <MobileSidebar ariaLabel={ariaLabel ?? 'Sidebar'} className={className} side={side}>
          {children}
        </MobileSidebar>
      );
    }
    return (
      <DesktopAnimatedSidebar
        {...props}
        ref={forwardedRef}
        ariaLabel={ariaLabel}
        className={className}
        side={side}
      >
        {children}
      </DesktopAnimatedSidebar>
    );
  },
);

export type AnimatedSidebarTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AnimatedSidebarTrigger = forwardRef<HTMLButtonElement, AnimatedSidebarTriggerProps>(
  function AnimatedSidebarTrigger({ className, onClick, type = 'button', ...props }, forwardedRef) {
    const context = useAnimatedSidebar();
    const expanded = context.isMobile ? context.openMobile : context.open;

    return (
      <button
        {...props}
        ref={mergeRefs(forwardedRef, context.registerTrigger)}
        aria-expanded={expanded}
        aria-label={props['aria-label'] ?? 'Toggle sidebar'}
        data-slot="sidebar-trigger"
        data-state={expanded ? 'expanded' : 'collapsed'}
        type={type}
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-xl outline-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            context.toggleSidebar();
          }
        }}
      />
    );
  },
);

export type AnimatedSidebarCloseProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AnimatedSidebarClose = forwardRef<HTMLButtonElement, AnimatedSidebarCloseProps>(
  function AnimatedSidebarClose({ className, onClick, type = 'button', ...props }, forwardedRef) {
    const context = useAnimatedSidebar();

    return (
      <button
        {...props}
        ref={forwardedRef}
        aria-label={props['aria-label'] ?? 'Close sidebar'}
        type={type}
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-xl outline-none',
          'focus-visible:ring-ring focus-visible:ring-2',
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) {
            return;
          }
          if (context.isMobile) {
            context.setOpenMobile(false);
          } else {
            context.setOpen(false);
          }
        }}
      />
    );
  },
);

export type AnimatedSidebarRailProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AnimatedSidebarRail = forwardRef<HTMLButtonElement, AnimatedSidebarRailProps>(
  function AnimatedSidebarRail({ className, onClick, type = 'button', ...props }, forwardedRef) {
    const context = useAnimatedSidebar();
    const panel = useAnimatedSidebarPanel();

    return (
      <button
        {...props}
        ref={forwardedRef}
        aria-label={props['aria-label'] ?? 'Toggle sidebar'}
        data-side={panel.side}
        tabIndex={-1}
        title="Toggle sidebar"
        type={type}
        className={cn(
          'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 outline-none md:block',
          'hover:after:bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent after:transition-colors',
          'data-[side=left]:left-full data-[side=right]:right-0 data-[side=right]:translate-x-1/2',
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            context.toggleSidebar();
          }
        }}
      />
    );
  },
);

export type AnimatedSidebarInsetProps = HTMLMotionProps<'main'>;

export const AnimatedSidebarInset = forwardRef<HTMLElement, AnimatedSidebarInsetProps>(
  function AnimatedSidebarInset({ className, ...props }, forwardedRef) {
    return (
      <motion.main
        {...props}
        ref={forwardedRef}
        data-slot="sidebar-inset"
        className={cn(
          'bg-background relative flex min-h-svh min-w-0 flex-1 flex-col',
          'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:shadow-sm',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarHeader({ className, ...props }, forwardedRef) {
    return (
      <div
        {...props}
        ref={forwardedRef}
        className={cn('flex shrink-0 flex-col gap-2 p-3', className)}
        data-slot="sidebar-header"
      />
    );
  },
);

export const AnimatedSidebarContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarContent({ className, ...props }, forwardedRef) {
    return (
      <div
        {...props}
        ref={forwardedRef}
        data-slot="sidebar-content"
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-2',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarFooter({ className, ...props }, forwardedRef) {
    return (
      <div
        {...props}
        ref={forwardedRef}
        data-slot="sidebar-footer"
        className={cn(
          'border-border flex shrink-0 flex-col gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          className,
        )}
      />
    );
  },
);

export const AnimatedSidebarGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarGroup({ className, ...props }, forwardedRef) {
    return (
      <div
        {...props}
        ref={forwardedRef}
        className={cn('flex w-full min-w-0 flex-col px-1 py-1.5', className)}
        data-slot="sidebar-group"
      />
    );
  },
);

export const AnimatedSidebarGroupLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function AnimatedSidebarGroupLabel({ children, className, ...props }, forwardedRef) {
    const { collapsed } = useAnimatedSidebarPanel();

    return (
      <div
        {...props}
        ref={forwardedRef}
        aria-hidden={collapsed}
        data-slot="sidebar-group-label"
        className={cn(
          'text-muted-foreground mb-1 h-7 overflow-hidden px-2 text-[10px] font-medium tracking-[0.14em] uppercase transition-opacity',
          collapsed ? 'opacity-0' : 'opacity-100',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);

export const AnimatedSidebarGroupContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function AnimatedSidebarGroupContent({ className, ...props }, forwardedRef) {
  return (
    <div
      {...props}
      ref={forwardedRef}
      className={cn('w-full min-w-0', className)}
      data-slot="sidebar-group-content"
    />
  );
});

export const AnimatedSidebarMenu = forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  function AnimatedSidebarMenu({ children, className, ...props }, forwardedRef) {
    return (
      <SharedLayoutBg
        {...props}
        ref={forwardedRef as React.Ref<HTMLElement>}
        as="ul"
        className={cn('flex w-full min-w-0 list-none flex-col gap-0.5', className)}
        data-slot="sidebar-menu"
        inset={0}
        pillClassName="rounded-xl bg-muted/70"
        pillContainerClassName="inset-y-auto top-0 h-9"
      >
        {children}
      </SharedLayoutBg>
    );
  },
);

export const AnimatedSidebarMenuItem = forwardRef<HTMLLIElement, HTMLMotionProps<'li'>>(
  function AnimatedSidebarMenuItem({ className, ...props }, forwardedRef) {
    return (
      <motion.li
        {...props}
        ref={forwardedRef}
        className={cn('relative', className)}
        data-slot="sidebar-menu-item"
        layout="position"
        transition={SPRING_LAYOUT}
      />
    );
  },
);

export interface AnimatedSidebarMenuSubProps extends Omit<HTMLMotionProps<'ul'>, 'children'> {
  open: boolean;
  children?: ReactNode;
}

export const AnimatedSidebarMenuSub = forwardRef<HTMLUListElement, AnimatedSidebarMenuSubProps>(
  function AnimatedSidebarMenuSub({ open, children, className, ...props }, forwardedRef) {
    const context = useAnimatedSidebar();
    const panel = useAnimatedSidebarPanel();

    return (
      <AnimatePresence initial={false} mode="popLayout">
        {open && !panel.collapsed ? (
          <motion.ul
            {...props}
            key="sidebar-submenu"
            ref={forwardedRef}
            animate={context.reduce ? { opacity: 1 } : 'open'}
            data-slot="sidebar-menu-sub"
            exit={context.reduce ? { opacity: 0 } : 'closed'}
            initial={context.reduce ? false : 'closed'}
            transition={context.reduce ? { duration: 0.12 } : undefined}
            variants={context.reduce ? undefined : SUBMENU_VARIANTS}
            className={cn(
              'border-border relative mt-1 ml-5 flex min-w-0 flex-col gap-0.5 border-l pl-3',
              className,
            )}
          >
            {children}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    );
  },
);

export const AnimatedSidebarMenuSubItem = forwardRef<HTMLLIElement, HTMLMotionProps<'li'>>(
  function AnimatedSidebarMenuSubItem({ className, ...props }, forwardedRef) {
    return (
      <motion.li
        {...props}
        ref={forwardedRef}
        className={cn('relative min-w-0', className)}
        data-slot="sidebar-menu-sub-item"
        variants={SUBMENU_ITEM_VARIANTS}
      />
    );
  },
);
