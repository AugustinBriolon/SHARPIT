import type { AgentActivityContentType, AgentActivityItem } from './types';

export function getContentType(items: AgentActivityItem[]): AgentActivityContentType {
  const first = items[0]?.type;
  return first && items.every((item) => item.type === first) ? first : 'mixed';
}

export function activityMaskImage(capped: boolean, working: boolean): string | undefined {
  if (!capped) {
    return undefined;
  }
  if (working) {
    return 'linear-gradient(to bottom, transparent, black 12px)';
  }
  return 'linear-gradient(to bottom, transparent, black 12px, black calc(100% - 12px), transparent)';
}

export function activityPanelState(
  working: boolean,
  expanded: boolean,
): 'working' | 'open' | 'closed' {
  if (working) {
    return 'working';
  }
  if (expanded) {
    return 'open';
  }
  return 'closed';
}
