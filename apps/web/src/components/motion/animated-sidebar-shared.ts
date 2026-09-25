import type { Variants } from 'motion/react';
import type { Ref } from 'react';
import { EASE_DRAWER, EASE_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

export type SidebarState = 'expanded' | 'collapsed';
export type SidebarSide = 'left' | 'right';
export type SidebarVariant = 'sidebar' | 'floating' | 'inset';
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none';

export const MOBILE_QUERY = '(max-width: 767px)';
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

export const PANEL_TRANSITION = {
  duration: 0.36,
  ease: EASE_DRAWER,
} as const;

export const SIDEBAR_MORPH_TRANSITION = {
  type: 'spring',
  stiffness: 380,
  damping: 35,
  mass: 0.75,
} as const;

export const LABEL_ENTER_TRANSITION = {
  duration: 0.2,
  delay: 0.08,
  ease: EASE_OUT,
} as const;

export const LABEL_EXIT_TRANSITION = {
  duration: 0.12,
  ease: EASE_OUT,
} as const;

export const SUBMENU_TRANSITION = {
  duration: 0.18,
  ease: EASE_OUT,
} as const;

export const SUBMENU_VARIANTS: Variants = {
  closed: {
    opacity: 0,
    clipPath: 'inset(0 0 100% 0 round 8px)',
    transition: {
      duration: 0.14,
      ease: EASE_OUT,
      staggerChildren: 0.025,
      staggerDirection: -1,
    },
  },
  open: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0 round 8px)',
    transition: {
      duration: 0.2,
      delayChildren: 0.035,
      ease: EASE_OUT,
      staggerChildren: 0.045,
    },
  },
};

export const SUBMENU_ITEM_VARIANTS: Variants = {
  closed: {
    opacity: 0,
    y: -6,
    filter: 'blur(3px)',
  },
  open: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: SUBMENU_TRANSITION,
  },
};

export const REDUCED_TRANSITION = {
  duration: 0.16,
  ease: EASE_OUT,
} as const;

export function subscribeToMobileQuery(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

export function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function getServerMobileSnapshot() {
  return false;
}

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && typeof ref === 'object') {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    }
  };
}

export function mobilePanelOpacity(reduce: boolean, openMobile: boolean): number {
  if (!reduce) {
    return 1;
  }
  return openMobile ? 1 : 0;
}

export function mobilePanelX(
  reduce: boolean,
  openMobile: boolean,
  side: SidebarSide,
): string | number {
  if (reduce) {
    return 0;
  }
  if (openMobile) {
    return '0%';
  }
  return side === 'left' ? '-100%' : '100%';
}

export function sidebarRailWidth(offcanvas: boolean, collapsed: boolean): string {
  if (offcanvas) {
    return '0px';
  }
  if (collapsed) {
    return 'var(--sidebar-width-icon)';
  }
  return 'var(--sidebar-width)';
}

export function offcanvasPanelX(offcanvas: boolean, side: SidebarSide): string {
  if (!offcanvas) {
    return '0%';
  }
  return side === 'left' ? '-100%' : '100%';
}

export function sidebarLabelTransition(reduce: boolean, collapsed: boolean) {
  if (reduce) {
    return REDUCED_TRANSITION;
  }
  if (collapsed) {
    return LABEL_EXIT_TRANSITION;
  }
  return LABEL_ENTER_TRANSITION;
}

export function sidebarLinkRel(rel: string | undefined, target?: string) {
  return rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined);
}

export function desktopPanelClassName(
  collapsible: SidebarCollapsible,
  variant: SidebarVariant,
  side: SidebarSide,
  panelClassName?: string,
) {
  return cn(
    'bg-background sticky top-0 flex h-svh w-full flex-col overflow-hidden',
    collapsible === 'offcanvas' && 'w-[var(--sidebar-width)]',
    variant === 'sidebar' &&
      (side === 'left' ? 'border-border border-r' : 'border-border border-l'),
    variant === 'floating' &&
      'border-border m-2 h-[calc(100svh-1rem)] rounded-2xl border shadow-sm',
    variant === 'inset' && 'm-2 h-[calc(100svh-1rem)] rounded-2xl',
    panelClassName,
  );
}
