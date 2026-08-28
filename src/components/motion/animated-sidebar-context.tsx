'use client';

import { useReducedMotion } from 'motion/react';
import {
  createContext,
  type CSSProperties,
  type HTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from '@/lib/utils';
import {
  getMobileSnapshot,
  getServerMobileSnapshot,
  SIDEBAR_KEYBOARD_SHORTCUT,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarState,
  subscribeToMobileQuery,
} from './animated-sidebar-shared';

export interface AnimatedSidebarContextValue {
  isMobile: boolean;
  layoutId: string;
  open: boolean;
  openMobile: boolean;
  reduce: boolean;
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  state: SidebarState;
  toggleSidebar: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  registerTrigger: (node: HTMLButtonElement | null) => void;
}

const AnimatedSidebarContext = createContext<AnimatedSidebarContextValue | null>(null);

export interface AnimatedSidebarPanelContextValue {
  collapsed: boolean;
  collapsible: SidebarCollapsible;
  side: SidebarSide;
}

const AnimatedSidebarPanelContext = createContext<AnimatedSidebarPanelContextValue | null>(null);

function useIsMobile() {
  return useSyncExternalStore(subscribeToMobileQuery, getMobileSnapshot, getServerMobileSnapshot);
}

export function useAnimatedSidebar() {
  const context = useContext(AnimatedSidebarContext);
  if (!context) {
    throw new Error('useAnimatedSidebar must be used inside AnimatedSidebarProvider.');
  }
  return context;
}

export function useAnimatedSidebarPanel() {
  const context = useContext(AnimatedSidebarPanelContext);
  if (!context) {
    throw new Error('Animated Sidebar parts must be used inside AnimatedSidebar.');
  }
  return context;
}

export const AnimatedSidebarPanelContextProvider = AnimatedSidebarPanelContext.Provider;

type SidebarProviderStyle = CSSProperties & {
  '--sidebar-width'?: string;
  '--sidebar-width-icon'?: string;
  '--sidebar-width-mobile'?: string;
};

export interface AnimatedSidebarProviderProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openMobile?: boolean;
  defaultOpenMobile?: boolean;
  onOpenMobileChange?: (open: boolean) => void;
  style?: SidebarProviderStyle;
}

export function AnimatedSidebarProvider({
  children,
  open,
  defaultOpen = true,
  onOpenChange,
  openMobile,
  defaultOpenMobile = false,
  onOpenMobileChange,
  className,
  style,
  ...props
}: AnimatedSidebarProviderProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalOpenMobile, setInternalOpenMobile] = useState(defaultOpenMobile);
  const isMobile = useIsMobile();
  const reduce = useReducedMotion() ?? false;
  const generatedId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const desktopOpen = open ?? internalOpen;
  const mobileOpen = openMobile ?? internalOpenMobile;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open],
  );

  const setOpenMobile = useCallback(
    (nextOpen: boolean) => {
      if (openMobile === undefined) {
        setInternalOpenMobile(nextOpen);
      }
      onOpenMobileChange?.(nextOpen);
    },
    [onOpenMobileChange, openMobile],
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setOpenMobile(!mobileOpen);
    } else {
      setOpen(!desktopOpen);
    }
  }, [desktopOpen, isMobile, mobileOpen, setOpen, setOpenMobile]);

  const registerTrigger = useCallback((node: HTMLButtonElement | null) => {
    triggerRef.current = node;
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [toggleSidebar]);

  return (
    <AnimatedSidebarContext.Provider
      value={{
        isMobile,
        layoutId: `${generatedId}-active`,
        open: desktopOpen,
        openMobile: mobileOpen,
        reduce,
        setOpen,
        setOpenMobile,
        state: desktopOpen ? 'expanded' : 'collapsed',
        toggleSidebar,
        triggerRef,
        registerTrigger,
      }}
    >
      <div
        {...props}
        className={cn('group/sidebar-wrapper flex min-h-svh w-full min-w-0', className)}
        data-slot="sidebar-wrapper"
        data-state={desktopOpen ? 'expanded' : 'collapsed'}
        style={{
          '--sidebar-width': '16rem',
          '--sidebar-width-icon': '4.25rem',
          '--sidebar-width-mobile': '18rem',
          ...style,
        }}
      >
        {children}
      </div>
    </AnimatedSidebarContext.Provider>
  );
}

function closeMobileSidebarIfNeeded(context: AnimatedSidebarContextValue, closeOnSelect: boolean) {
  if (context.isMobile && closeOnSelect) {
    context.setOpenMobile(false);
  }
}

function expandCollapsedSidebarIfNeeded(
  context: AnimatedSidebarContextValue,
  panel: AnimatedSidebarPanelContextValue | undefined,
  ariaExpanded: boolean | undefined,
) {
  if (ariaExpanded !== undefined && panel?.collapsed && !context.isMobile) {
    context.setOpen(true);
  }
}

export function createSidebarMenuSelect(options: {
  disabled: boolean;
  onSelect?: () => void;
  context: AnimatedSidebarContextValue;
  closeOnSelect: boolean;
  panel?: AnimatedSidebarPanelContextValue;
  ariaExpanded?: boolean;
}) {
  const { disabled, onSelect, context, closeOnSelect, panel, ariaExpanded } = options;
  return (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onSelect?.();
    closeMobileSidebarIfNeeded(context, closeOnSelect);
    expandCollapsedSidebarIfNeeded(context, panel, ariaExpanded);
  };
}
