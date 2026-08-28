import type { ReactNode } from 'react';
import type { ToolResultStatus } from './tool-result';

export function getStatusLabel(status: ToolResultStatus) {
  const labels: Record<ToolResultStatus, string> = {
    running: 'Running',
    success: 'Completed',
    error: 'Failed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

export function getSwapKey(value: ReactNode, fallback: string) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

export function getStatusClass(status: ToolResultStatus) {
  if (status === 'running') {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (status === 'success') {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (status === 'error') {
    return 'text-rose-600 dark:text-rose-400';
  }
  return 'text-muted-foreground';
}
