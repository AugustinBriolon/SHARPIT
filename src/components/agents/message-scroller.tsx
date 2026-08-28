'use client';
// beui.dev/components/agents/chat-app

import { useReducedMotion } from 'motion/react';
import { type ComponentPropsWithRef, type Ref } from 'react';
import { PreviewRail, type PreviewRailItem } from '@/components/motion/preview-rail';
import { useMessageScrollerRail } from '@/components/agents/use-message-scroller';
import { cn } from '@/lib/utils';

export interface MessageScrollerProps extends ComponentPropsWithRef<'div'> {
  /** Keep streamed output pinned while the reader remains near the end. */
  followOutput?: boolean;
  /** Distance from the end that still counts as following the output. */
  followThreshold?: number;
  /** Smoothly follow growing content. */
  smooth?: boolean;
  /** Reports when the reader leaves or returns to the live edge. */
  onFollowChange?: (following: boolean) => void;
  /** Accessible label for the scrollable transcript. */
  label?: string;
  /** Marks the transcript as waiting for more streamed content. */
  busy?: boolean;
  /** Adds a compact rail for navigating between rendered Message rows. */
  navigation?: 'rail';
  /** Accessible label for the optional message navigation rail. */
  navigationLabel?: string;
  viewportClassName?: string;
  contentClassName?: string;
  railClassName?: string;
  viewportRef?: Ref<HTMLElement>;
  viewportProps?: Omit<ComponentPropsWithRef<'section'>, 'children' | 'className' | 'ref'>;
  contentProps?: Omit<ComponentPropsWithRef<'div'>, 'children' | 'className' | 'ref'>;
}

function MessageScrollerViewport({
  label,
  busy,
  navigation,
  railOverflowing,
  viewportClassName,
  contentClassName,
  setViewportRef,
  contentRef,
  restViewportProps,
  contentProps,
  children,
  onViewportKeyDown,
  onViewportScroll,
  onViewportTouchStart,
  onViewportWheel,
  handleScroll,
  leaveLiveEdge,
}: {
  label: string;
  busy?: boolean;
  navigation?: 'rail';
  railOverflowing: boolean;
  viewportClassName?: string;
  contentClassName?: string;
  setViewportRef: (node: HTMLElement | null) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  restViewportProps: Omit<ComponentPropsWithRef<'section'>, 'children' | 'className' | 'ref'>;
  contentProps?: Omit<ComponentPropsWithRef<'div'>, 'children' | 'className' | 'ref'>;
  children: React.ReactNode;
  onViewportKeyDown?: ComponentPropsWithRef<'section'>['onKeyDown'];
  onViewportScroll?: ComponentPropsWithRef<'section'>['onScroll'];
  onViewportTouchStart?: ComponentPropsWithRef<'section'>['onTouchStart'];
  onViewportWheel?: ComponentPropsWithRef<'section'>['onWheel'];
  handleScroll: () => void;
  leaveLiveEdge: () => void;
}) {
  return (
    <section
      ref={setViewportRef}
      aria-label={label}
      {...restViewportProps}
      className={cn(
        'focus-visible:ring-ring h-full overflow-y-auto overscroll-contain outline-none [overflow-anchor:none] focus-visible:ring-2 focus-visible:ring-inset',
        navigation === 'rail'
          ? '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
          : '[scrollbar-gutter:stable]',
        viewportClassName,
        navigation === 'rail' && railOverflowing && 'pr-10',
      )}
      onKeyDown={(event) => {
        if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) {
          leaveLiveEdge();
        }
        onViewportKeyDown?.(event);
      }}
      onScroll={(event) => {
        handleScroll();
        onViewportScroll?.(event);
      }}
      onTouchStart={(event) => {
        leaveLiveEdge();
        onViewportTouchStart?.(event);
      }}
      onWheel={(event) => {
        leaveLiveEdge();
        onViewportWheel?.(event);
      }}
    >
      <div
        ref={contentRef}
        aria-busy={busy}
        aria-live="polite"
        aria-relevant="additions text"
        className={contentClassName}
        role="log"
        {...contentProps}
      >
        {children}
      </div>
    </section>
  );
}

function MessageScrollerRail({
  activeRailId,
  railItems,
  railOverflowing,
  navigationLabel,
  railClassName,
  scrollToRailItem,
  children,
}: {
  activeRailId: string;
  railItems: PreviewRailItem[];
  railOverflowing: boolean;
  navigationLabel: string;
  railClassName?: string;
  scrollToRailItem: (item: PreviewRailItem) => void;
  children: React.ReactNode;
}) {
  return (
    <PreviewRail
      activeId={activeRailId}
      className="h-full min-h-0 overflow-hidden"
      items={railOverflowing ? railItems : []}
      itemSize={14}
      label={navigationLabel}
      previewClassName="mr-1 w-64 max-w-full [&_[data-slot=preview-rail-card]]:h-20 [&_[data-slot=preview-rail-card]]:overflow-hidden [&_[data-slot=preview-rail-card]]:p-3 [&_[data-slot=preview-rail-title]]:line-clamp-1 [&_[data-slot=preview-rail-title]]:text-xs [&_[data-slot=preview-rail-title]]:leading-4 [&_[data-slot=preview-rail-description]]:line-clamp-2 [&_[data-slot=preview-rail-description]]:text-xs [&_[data-slot=preview-rail-description]]:leading-4"
      previewContainerClassName="right-8 left-3"
      previewSide="before"
      railClassName={cn(
        'absolute inset-y-3 right-1 w-7 content-center py-1 [&_[data-slot=preview-rail-item]]:w-7 [&_[data-slot=preview-rail-item]]:justify-end [&_[data-slot=preview-rail-tick]]:h-px [&_[data-slot=preview-rail-tick]]:w-4 [&_[data-slot=preview-rail-tick]]:origin-right',
        railOverflowing ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        railClassName,
      )}
      highlightActive
      onItemSelect={scrollToRailItem}
    >
      {children}
    </PreviewRail>
  );
}

function MessageScrollerInner({
  followOutput,
  followThreshold,
  smooth,
  onFollowChange,
  label,
  busy,
  navigation,
  navigationLabel,
  viewportClassName,
  contentClassName,
  railClassName,
  externalViewportRef,
  viewportProps,
  contentProps,
  className,
  children,
  ...props
}: MessageScrollerProps & {
  followOutput: boolean;
  followThreshold: number;
  smooth: boolean;
  label: string;
  navigationLabel: string;
  externalViewportRef?: Ref<HTMLElement>;
}) {
  const reduce = useReducedMotion() ?? false;

  const {
    contentRef,
    railItems,
    activeRailId,
    railOverflowing,
    handleScroll,
    leaveLiveEdge,
    scrollToRailItem,
    setViewportRef,
  } = useMessageScrollerRail({
    navigation,
    followThreshold,
    followOutput,
    reduce,
    smooth,
    onFollowChange,
    externalViewportRef,
  });

  const {
    onScroll: onViewportScroll,
    onWheel: onViewportWheel,
    onTouchStart: onViewportTouchStart,
    onKeyDown: onViewportKeyDown,
    ...restViewportProps
  } = viewportProps ?? {};

  const viewport = (
    <MessageScrollerViewport
      busy={busy}
      contentClassName={contentClassName}
      contentProps={contentProps}
      contentRef={contentRef}
      handleScroll={handleScroll}
      label={label}
      leaveLiveEdge={leaveLiveEdge}
      navigation={navigation}
      railOverflowing={railOverflowing}
      restViewportProps={restViewportProps}
      setViewportRef={setViewportRef}
      viewportClassName={viewportClassName}
      onViewportKeyDown={onViewportKeyDown}
      onViewportScroll={onViewportScroll}
      onViewportTouchStart={onViewportTouchStart}
      onViewportWheel={onViewportWheel}
    >
      {children}
    </MessageScrollerViewport>
  );

  const body =
    navigation === 'rail' ? (
      <MessageScrollerRail
        activeRailId={activeRailId}
        navigationLabel={navigationLabel}
        railClassName={railClassName}
        railItems={railItems}
        railOverflowing={railOverflowing}
        scrollToRailItem={scrollToRailItem}
      >
        {viewport}
      </MessageScrollerRail>
    ) : (
      viewport
    );

  return (
    <div className={cn('min-h-0', className)} data-slot="message-scroller" {...props}>
      {body}
    </div>
  );
}

export function MessageScroller({
  followOutput = true,
  followThreshold = 56,
  smooth = true,
  onFollowChange,
  label = 'Conversation',
  busy,
  navigation,
  navigationLabel = 'Message navigation',
  viewportClassName,
  contentClassName,
  railClassName,
  viewportRef: externalViewportRef,
  viewportProps,
  contentProps,
  className,
  children,
  ...props
}: MessageScrollerProps) {
  return (
    <MessageScrollerInner
      busy={busy}
      className={className}
      contentClassName={contentClassName}
      contentProps={contentProps}
      externalViewportRef={externalViewportRef}
      followOutput={followOutput}
      followThreshold={followThreshold}
      label={label}
      navigation={navigation}
      navigationLabel={navigationLabel}
      railClassName={railClassName}
      smooth={smooth}
      viewportClassName={viewportClassName}
      viewportProps={viewportProps}
      onFollowChange={onFollowChange}
      {...props}
    >
      {children}
    </MessageScrollerInner>
  );
}
