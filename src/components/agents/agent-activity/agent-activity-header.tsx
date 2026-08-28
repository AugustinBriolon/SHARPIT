'use client';

import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { ThinkingShimmer } from '@/components/agents/loading-states/thinking-shimmer';
import { SPRING_SWAP } from '@/lib/ease';
import type { AgentActivityProps } from './types';

export function AgentActivityHeader({
  completedSummary,
  contentId,
  duration,
  expanded,
  liveLabel,
  reduce,
  renderCompletedStatus,
  renderWorkingStatus,
  toggle,
  triggerId,
  working,
}: {
  completedSummary: React.ReactNode;
  contentId: string;
  duration: number;
  expanded: boolean;
  liveLabel: React.ReactNode;
  reduce: boolean;
  renderCompletedStatus?: AgentActivityProps['renderCompletedStatus'];
  renderWorkingStatus?: AgentActivityProps['renderWorkingStatus'];
  toggle: () => void;
  triggerId: string;
  working: boolean;
}) {
  if (working) {
    return (
      <div
        className="text-muted-foreground flex h-7 min-w-0 items-center"
        id={triggerId}
        role="status"
      >
        {renderWorkingStatus ? (
          renderWorkingStatus({ label: liveLabel, duration })
        ) : (
          <ThinkingShimmer>{liveLabel}</ThinkingShimmer>
        )}
      </div>
    );
  }

  return (
    <button
      aria-controls={contentId}
      aria-expanded={expanded}
      className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-7 min-w-0 items-center gap-1.5 rounded-md text-left font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      id={triggerId}
      type="button"
      onClick={toggle}
    >
      <span className="truncate">
        {renderCompletedStatus
          ? renderCompletedStatus({ summary: completedSummary, duration })
          : completedSummary}
      </span>
      <motion.span
        animate={{ rotate: expanded ? 180 : 0 }}
        aria-hidden="true"
        className="text-muted-foreground/70 group-hover:text-foreground inline-flex shrink-0"
        transition={reduce ? { duration: 0 } : SPRING_SWAP}
      >
        <ChevronDown className="size-3.5" />
      </motion.span>
    </button>
  );
}
