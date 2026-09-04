'use client';

import { motion } from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  AnimatedSidebarPanelContextProvider,
  useAnimatedSidebar,
} from './animated-sidebar-context';
import {
  handleMobilePanelKeyDown,
  lockBodyScrollWhileOpen,
} from './animated-sidebar-mobile-helpers';
import {
  mobilePanelOpacity,
  mobilePanelX,
  PANEL_TRANSITION,
  REDUCED_TRANSITION,
  type SidebarSide,
} from './animated-sidebar-shared';

function MobileSidebarPanel({
  ariaLabel,
  children,
  className,
  side,
  panelRef,
  hidden: _hidden,
  setHidden,
  openMobileRef,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  side: SidebarSide;
  panelRef: React.RefObject<HTMLDivElement | null>;
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  openMobileRef: React.MutableRefObject<boolean>;
}) {
  const context = useAnimatedSidebar();

  return (
    <motion.div
      ref={panelRef}
      aria-hidden={!context.openMobile}
      aria-label={ariaLabel}
      aria-modal="true"
      data-mobile="true"
      data-side={side}
      data-state={context.openMobile ? 'expanded' : 'collapsed'}
      inert={!context.openMobile}
      initial={false}
      role="dialog"
      tabIndex={-1}
      transition={context.reduce ? REDUCED_TRANSITION : PANEL_TRANSITION}
      animate={{
        opacity: mobilePanelOpacity(context.reduce, context.openMobile),
        x: mobilePanelX(context.reduce, context.openMobile, side),
      }}
      className={cn(
        'pointer-events-auto fixed inset-y-0 flex h-dvh w-(--sidebar-width-mobile) max-w-[88vw] flex-col overflow-hidden',
        'border-border bg-background shadow-2xl will-change-transform',
        side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
        !context.openMobile && 'pointer-events-none',
        className,
      )}
      onAnimationComplete={() => {
        if (!openMobileRef.current) {
          setHidden(true);
        }
      }}
      onKeyDown={(event) =>
        handleMobilePanelKeyDown(event, panelRef, () => context.setOpenMobile(false))
      }
    >
      <AnimatedSidebarPanelContextProvider value={{ collapsed: false, collapsible: 'none', side }}>
        {children}
      </AnimatedSidebarPanelContextProvider>
    </motion.div>
  );
}

export function MobileSidebar({
  ariaLabel,
  children,
  className,
  side,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  side: SidebarSide;
}) {
  const context = useAnimatedSidebar();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(!context.openMobile);
  const openMobileRef = useRef(context.openMobile);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    openMobileRef.current = context.openMobile;
    if (context.openMobile) {
      setHidden(false);
    }
  }, [context.openMobile]);

  useEffect(() => {
    return lockBodyScrollWhileOpen(context.openMobile, panelRef, () => {
      context.triggerRef.current?.focus({ preventScroll: true });
    });
  }, [context.openMobile, context.triggerRef]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed top-0 left-0 z-50 size-0 md:hidden',
        hidden && !context.openMobile ? 'invisible' : 'visible',
      )}
    >
      <motion.button
        animate={{ opacity: context.openMobile ? 1 : 0 }}
        aria-label="Close sidebar"
        initial={false}
        tabIndex={context.openMobile ? 0 : -1}
        transition={context.reduce ? REDUCED_TRANSITION : PANEL_TRANSITION}
        type="button"
        className={cn(
          'fixed inset-0 bg-black/40',
          context.openMobile ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        onClick={() => context.setOpenMobile(false)}
      />
      <MobileSidebarPanel
        ariaLabel={ariaLabel}
        className={className}
        hidden={hidden}
        openMobileRef={openMobileRef}
        panelRef={panelRef}
        setHidden={setHidden}
        side={side}
      >
        {children}
      </MobileSidebarPanel>
    </div>,
    document.body,
  );
}
