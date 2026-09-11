import type { ReactNode } from 'react';
import type { AgentActivityContentType, AgentActivityItem } from './types';

function formatDuration(duration: number) {
  const seconds = Math.max(0, Math.round(duration));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

function traceSummary(items: AgentActivityItem[]): string {
  const messages = items.filter(
    (item) => item.type === 'trace' && (item.kind === 'thinking' || item.kind === 'message'),
  ).length;
  const tools = items.length - messages;
  return `${tools} ${tools === 1 ? 'tool call' : 'tool calls'}, ${messages} ${messages === 1 ? 'message' : 'messages'}`;
}

export function getActivitySummary(
  type: AgentActivityContentType,
  items: AgentActivityItem[],
  duration: number,
): ReactNode {
  if (type === 'step' || type === 'text') {
    return (
      <>
        Thought for <span className="tabular-nums">{formatDuration(duration)}</span>
      </>
    );
  }
  if (type === 'search') {
    return 'Searched the web';
  }
  if (type === 'tool') {
    return `Ran ${items.length} ${items.length === 1 ? 'tool' : 'tools'}`;
  }
  if (type === 'trace') {
    return traceSummary(items);
  }
  return `Completed ${items.length} ${items.length === 1 ? 'step' : 'steps'}`;
}

export function getActiveLabel(type: AgentActivityContentType) {
  if (type === 'search') {
    return 'Searching the web…';
  }
  if (type === 'tool') {
    return 'Running tools…';
  }
  if (type === 'trace') {
    return 'Working through the run…';
  }
  if (type === 'mixed') {
    return 'Working through it…';
  }
  return 'Thinking…';
}

export { formatDuration };
