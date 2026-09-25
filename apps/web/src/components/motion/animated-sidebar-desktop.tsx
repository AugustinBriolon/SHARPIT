'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  AnimatedSidebarPanelContextProvider,
  useAnimatedSidebar,
} from './animated-sidebar-context';
import {
  desktopPanelClassName,
  offcanvasPanelX,
  PANEL_TRANSITION,
  REDUCED_TRANSITION,
  SIDEBAR_MORPH_TRANSITION,
  sidebarRailWidth,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from './animated-sidebar-shared';

export interface AnimatedSidebarProps extends Omit<HTMLMotionProps<'aside'>, 'children'> {
  children?: ReactNode;
  side?: SidebarSide;
  variant?: SidebarVariant;
  collapsible?: SidebarCollapsible;
  ariaLabel?: string;
  panelClassName?: string;
}

function DesktopSidebarPanel({
  children,
  collapsible,
  collapsed,
  offcanvas,
  side,
  variant,
  panelClassName,
  reduce,
}: {
  children?: ReactNode;
  collapsible: SidebarCollapsible;
  collapsed: boolean;
  offcanvas: boolean;
  side: SidebarSide;
  variant: SidebarVariant;
  panelClassName?: string;
  reduce: boolean;
}) {
  return (
    <motion.div
      className={desktopPanelClassName(collapsible, variant, side, panelClassName)}
      initial={false}
      transition={reduce ? REDUCED_TRANSITION : PANEL_TRANSITION}
      animate={{
        opacity: offcanvas ? 0 : 1,
        x: offcanvasPanelX(offcanvas, side),
      }}
    >
      <AnimatedSidebarPanelContextProvider value={{ collapsed, collapsible, side }}>
        {children}
      </AnimatedSidebarPanelContextProvider>
    </motion.div>
  );
}

function desktopSidebarAsideClassName(side: SidebarSide, className?: string) {
  return cn(
    'group/sidebar relative hidden h-auto shrink-0 will-change-[width] md:block',
    'peer',
    side === 'right' && 'order-last',
    className,
  );
}

function useDesktopSidebarLayout(collapsible: SidebarCollapsible, contextOpen: boolean) {
  const collapsed = collapsible !== 'none' && !contextOpen;
  const offcanvas = collapsed && collapsible === 'offcanvas';
  const width = sidebarRailWidth(offcanvas, collapsed);
  return { collapsed, offcanvas, width };
}

export const DesktopAnimatedSidebar = forwardRef<HTMLElement, AnimatedSidebarProps>(
  function DesktopAnimatedSidebar(
    {
      side = 'left',
      variant = 'sidebar',
      collapsible = 'icon',
      ariaLabel = 'Sidebar',
      children,
      className,
      panelClassName,
      style,
      ...props
    },
    forwardedRef,
  ) {
    const context = useAnimatedSidebar();
    const { collapsed, offcanvas, width } = useDesktopSidebarLayout(collapsible, context.open);

    return (
      <motion.aside
        {...props}
        ref={forwardedRef}
        animate={{ width }}
        aria-label={ariaLabel}
        className={desktopSidebarAsideClassName(side, className)}
        data-collapsible={collapsible}
        data-side={side}
        data-slot="sidebar"
        data-state={collapsed ? 'collapsed' : 'expanded'}
        data-variant={variant}
        initial={false}
        style={style}
        transition={context.reduce ? { duration: 0 } : SIDEBAR_MORPH_TRANSITION}
      >
        <DesktopSidebarPanel
          collapsed={collapsed}
          collapsible={collapsible}
          offcanvas={offcanvas}
          panelClassName={panelClassName}
          reduce={context.reduce}
          side={side}
          variant={variant}
        >
          {children}
        </DesktopSidebarPanel>
      </motion.aside>
    );
  },
);
