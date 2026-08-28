'use client';

import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { SPRING_LAYOUT, SPRING_PRESS } from '@/lib/ease';
import { cn } from '@/lib/utils';
import {
  createSidebarMenuSelect,
  useAnimatedSidebar,
  useAnimatedSidebarPanel,
  type AnimatedSidebarContextValue,
  type AnimatedSidebarPanelContextValue,
} from './animated-sidebar-context';
import { sidebarLabelTransition, sidebarLinkRel } from './animated-sidebar-shared';

type SidebarInteractiveProps = {
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  disabled?: boolean;
  isActive: boolean;
  ariaExpanded?: boolean;
  ariaLabel?: string;
  title?: string;
  className: string;
  onClick: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  children: ReactNode;
  reduce: boolean;
};

function SidebarInteractiveControl({
  href,
  target,
  rel,
  disabled,
  isActive,
  ariaExpanded,
  ariaLabel,
  title,
  className,
  onClick,
  children,
  reduce,
}: SidebarInteractiveProps) {
  const tap = reduce || disabled ? undefined : { scale: 0.98 };

  if (href) {
    return (
      <motion.a
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        aria-expanded={ariaExpanded}
        aria-label={ariaLabel}
        className={className}
        href={href}
        rel={sidebarLinkRel(rel, target)}
        tabIndex={disabled ? -1 : undefined}
        target={target}
        title={title}
        transition={SPRING_PRESS}
        whileTap={tap}
        onClick={onClick}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      aria-current={isActive ? 'page' : undefined}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      title={title}
      transition={SPRING_PRESS}
      type="button"
      whileTap={tap}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function SubButtonContent({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
        {icon ?? <span className="size-1 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </>
  );
}

export interface AnimatedSidebarMenuSubButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  href?: string;
  isActive?: boolean;
  disabled?: boolean;
  closeOnSelect?: boolean;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  onSelect?: () => void;
  className?: string;
}

export function AnimatedSidebarMenuSubButton({
  children,
  icon,
  href,
  isActive = false,
  disabled = false,
  closeOnSelect = true,
  target,
  rel,
  onSelect,
  className,
}: AnimatedSidebarMenuSubButtonProps) {
  const context = useAnimatedSidebar();
  const select = createSidebarMenuSelect({ disabled, onSelect, context, closeOnSelect });
  const interactiveClassName = cn(
    'flex min-h-8 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-xs outline-none',
    'text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground',
    'focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring',
    isActive && 'bg-muted/70 text-foreground',
    disabled && 'cursor-not-allowed opacity-40',
    className,
  );

  return (
    <SidebarInteractiveControl
      className={interactiveClassName}
      disabled={disabled}
      href={href}
      isActive={isActive}
      reduce={context.reduce}
      rel={rel}
      target={target}
      onClick={select}
    >
      <SubButtonContent icon={icon}>{children}</SubButtonContent>
    </SidebarInteractiveControl>
  );
}

function MenuButtonLabel({
  children,
  panel,
  context,
}: {
  children: ReactNode;
  panel: AnimatedSidebarPanelContextValue;
  context: AnimatedSidebarContextValue;
}) {
  return (
    <motion.span
      animate={{ opacity: panel.collapsed ? 0 : 1, x: panel.collapsed ? -4 : 0 }}
      aria-hidden={panel.collapsed}
      initial={false}
      transition={sidebarLabelTransition(context.reduce, panel.collapsed)}
      className={cn(
        'relative z-10 min-w-0 flex-1 truncate',
        panel.collapsed && 'pointer-events-none',
      )}
    >
      {children}
    </motion.span>
  );
}

function MenuButtonChevron({
  ariaExpanded,
  panel,
  context,
}: {
  ariaExpanded: boolean;
  panel: AnimatedSidebarPanelContextValue;
  context: AnimatedSidebarContextValue;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className="text-muted-foreground relative z-10 grid size-4 shrink-0 place-items-center"
      initial={false}
      transition={context.reduce ? { duration: 0 } : SPRING_LAYOUT}
      animate={{
        opacity: panel.collapsed ? 0 : 1,
        rotate: ariaExpanded ? 90 : 0,
        x: panel.collapsed ? 4 : 0,
      }}
    >
      <ChevronRight className="size-3.5" />
    </motion.span>
  );
}

function MenuButtonContent({
  children,
  icon,
  badge,
  isActive,
  ariaExpanded,
  panel,
  context,
}: {
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  isActive: boolean;
  ariaExpanded?: boolean;
  panel: AnimatedSidebarPanelContextValue;
  context: AnimatedSidebarContextValue;
}) {
  return (
    <>
      {isActive ? (
        <motion.span
          className="bg-muted absolute inset-0 rounded-xl"
          layoutId={context.layoutId}
          transition={context.reduce ? { duration: 0 } : SPRING_LAYOUT}
        />
      ) : null}
      {icon ? (
        <span aria-hidden="true" className="relative z-10 grid size-5 shrink-0 place-items-center">
          {icon}
        </span>
      ) : null}
      <MenuButtonLabel context={context} panel={panel}>
        {children}
      </MenuButtonLabel>
      {badge && !panel.collapsed ? (
        <span className="text-muted-foreground relative z-10 shrink-0 text-xs">{badge}</span>
      ) : null}
      {ariaExpanded !== undefined ? (
        <MenuButtonChevron ariaExpanded={ariaExpanded} context={context} panel={panel} />
      ) : null}
    </>
  );
}

export interface AnimatedSidebarMenuButtonProps {
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  href?: string;
  isActive?: boolean;
  ariaExpanded?: boolean;
  disabled?: boolean;
  closeOnSelect?: boolean;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  onSelect?: () => void;
  className?: string;
}

function menuButtonClassName(isActive: boolean, disabled: boolean, className?: string) {
  return cn(
    'relative flex min-h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-3 text-left text-sm font-medium outline-none',
    'text-muted-foreground transition-colors hover:text-foreground',
    'focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring',
    isActive && 'text-foreground',
    disabled && 'cursor-not-allowed opacity-40',
    className,
  );
}

function useMenuButtonSelect(
  props: Pick<
    AnimatedSidebarMenuButtonProps,
    'disabled' | 'onSelect' | 'closeOnSelect' | 'ariaExpanded'
  >,
) {
  const context = useAnimatedSidebar();
  const panel = useAnimatedSidebarPanel();
  const shouldCloseOnSelect = props.closeOnSelect ?? props.ariaExpanded === undefined;
  const select = createSidebarMenuSelect({
    disabled: props.disabled ?? false,
    onSelect: props.onSelect,
    context,
    closeOnSelect: shouldCloseOnSelect,
    panel,
    ariaExpanded: props.ariaExpanded,
  });
  return { context, panel, select };
}

export function AnimatedSidebarMenuButton({
  children,
  icon,
  badge,
  href,
  isActive = false,
  ariaExpanded,
  disabled = false,
  closeOnSelect,
  target,
  rel,
  onSelect,
  className,
}: AnimatedSidebarMenuButtonProps) {
  const { context, panel, select } = useMenuButtonSelect({
    disabled,
    onSelect,
    closeOnSelect,
    ariaExpanded,
  });
  const textLabel = typeof children === 'string' ? children : undefined;

  return (
    <SidebarInteractiveControl
      ariaExpanded={ariaExpanded}
      ariaLabel={panel.collapsed ? textLabel : undefined}
      className={menuButtonClassName(isActive, disabled, className)}
      disabled={disabled}
      href={href}
      isActive={isActive}
      reduce={context.reduce}
      rel={rel}
      target={target}
      title={panel.collapsed ? textLabel : undefined}
      onClick={select}
    >
      <MenuButtonContent
        ariaExpanded={ariaExpanded}
        badge={badge}
        context={context}
        icon={icon}
        isActive={isActive}
        panel={panel}
      >
        {children}
      </MenuButtonContent>
    </SidebarInteractiveControl>
  );
}
