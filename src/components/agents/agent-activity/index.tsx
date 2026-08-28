'use client';
// beui.dev/components/agents/chat-app

import { useId } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { AgentActivityHeader } from './agent-activity-header';
import { getActiveLabel, getActivitySummary } from './agent-activity-helpers';
import { AgentActivityPanel } from './agent-activity-list';
import { activityMaskImage, activityPanelState } from './agent-activity-utils';
import { useAgentActivityLayout } from './use-agent-activity';
import type { AgentActivityProps } from './types';

export type {
  AgentActivityContentType,
  AgentActivityItem,
  AgentActivityProps,
  AgentActivitySearch,
  AgentActivityStatus,
  AgentActivityStep,
  AgentActivityText,
  AgentActivityTool,
  AgentActivityTrace,
  AgentSearchResult,
  AgentStepStatus,
  AgentTraceKind,
} from './types';

export function AgentActivity(props: AgentActivityProps) {
  const {
    items,
    status = 'working',
    duration = 0,
    activeLabel,
    summary,
    renderWorkingStatus,
    renderCompletedStatus,
    className,
    contentClassName,
  } = props;

  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;
  const layout = useAgentActivityLayout(props);

  const liveLabel = activeLabel ?? getActiveLabel(layout.contentType);
  const completedSummary = summary ?? getActivitySummary(layout.contentType, items, duration);

  return (
    <div
      aria-busy={layout.working}
      className={cn('w-full text-sm', className)}
      data-content={layout.contentType}
      data-state={activityPanelState(layout.working, layout.expanded)}
    >
      <AgentActivityHeader
        completedSummary={completedSummary}
        contentId={contentId}
        duration={duration}
        expanded={layout.expanded}
        liveLabel={liveLabel}
        reduce={reduce}
        renderCompletedStatus={renderCompletedStatus}
        renderWorkingStatus={renderWorkingStatus}
        toggle={layout.toggle}
        triggerId={triggerId}
        working={layout.working}
      />

      <AgentActivityPanel
        capped={layout.capped}
        contentClassName={contentClassName}
        contentId={contentId}
        contentRef={layout.contentRef}
        expanded={layout.expanded}
        items={items}
        maskImage={activityMaskImage(layout.capped, layout.working)}
        reduce={reduce}
        streamOffset={layout.streamOffset}
        triggerId={triggerId}
        viewportHeight={layout.viewportHeight}
        viewportRef={layout.viewportRef}
        working={layout.working}
      />
    </div>
  );
}
