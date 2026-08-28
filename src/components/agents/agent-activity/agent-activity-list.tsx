'use client';

import { AnimatePresence, motion } from 'motion/react';
import { AgentDisclosure } from '@/components/agents/agent-disclosure';
import { EASE_OUT, SPRING_LAYOUT } from '@/lib/ease';
import { cn } from '@/lib/utils';
import { ActivityRow } from './activity-row';
import type { AgentActivityItem } from './types';

export function AgentActivityList({
  contentClassName,
  contentRef,
  items,
  reduce,
  streamOffset,
}: {
  contentClassName?: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  items: AgentActivityItem[];
  reduce: boolean;
  streamOffset: number;
}) {
  return (
    <motion.div
      ref={contentRef}
      animate={{ y: streamOffset }}
      className={cn('space-y-0.5 py-2', contentClassName)}
      initial={false}
      role="list"
      transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
            layout="position"
            role="listitem"
            transition={
              reduce
                ? { duration: 0 }
                : {
                    opacity: { duration: 0.18, ease: EASE_OUT },
                    y: SPRING_LAYOUT,
                    layout: SPRING_LAYOUT,
                  }
            }
          >
            <ActivityRow item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export function AgentActivityPanel({
  capped,
  contentClassName,
  contentId,
  contentRef,
  expanded,
  items,
  maskImage,
  reduce,
  streamOffset,
  triggerId,
  viewportHeight,
  viewportRef,
  working,
}: {
  capped: boolean;
  contentClassName?: string;
  contentId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  expanded: boolean;
  items: AgentActivityItem[];
  maskImage?: string;
  reduce: boolean;
  streamOffset: number;
  triggerId: string;
  viewportHeight: number;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  working: boolean;
}) {
  return (
    <AgentDisclosure
      aria-labelledby={triggerId}
      id={contentId}
      open={expanded}
      openHeight={viewportHeight}
      role="region"
    >
      <div
        ref={viewportRef}
        style={{ height: viewportHeight, maskImage, WebkitMaskImage: maskImage }}
        className={cn(
          'scrollbar-hide pr-1',
          capped && expanded && !working ? 'overflow-y-auto' : 'overflow-y-hidden',
        )}
      >
        <AgentActivityList
          contentClassName={contentClassName}
          contentRef={contentRef}
          items={items}
          reduce={reduce}
          streamOffset={streamOffset}
        />
      </div>
    </AgentDisclosure>
  );
}
