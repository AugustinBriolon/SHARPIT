'use client';

import type { SmartAlert } from '@/lib/alerts';
import type { ProactiveAction } from '@/lib/proactive-coach';
import { TodayTodoList } from '@/components/today/today-todo-list';

const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 } as const;

export interface TodayTodoItem {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  sortKey: number;
  action?: ProactiveAction;
}

/** Fusionne alertes + actions proactives en une liste priorisée (une seule voix). */
export function buildTodayTodos(alerts: SmartAlert[], actions: ProactiveAction[]): TodayTodoItem[] {
  const items: TodayTodoItem[] = [
    ...actions.map((a) => ({
      id: `action-${a.id}`,
      severity: a.severity,
      title: a.title,
      detail: a.detail,
      sortKey: a.priority,
      action: a,
    })),
    ...alerts.map((a) => ({
      id: `alert-${a.id}`,
      severity: a.severity,
      title: a.title,
      detail: a.detail,
      sortKey: 100 + SEVERITY_RANK[a.severity],
    })),
  ];

  return items.sort((a, b) => {
    const sd = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sd !== 0) return sd;
    return a.sortKey - b.sortKey;
  });
}

export function TodayTodoSection({
  alerts,
  actions,
}: {
  alerts: SmartAlert[];
  actions: ProactiveAction[];
}) {
  const todos = buildTodayTodos(alerts, actions);
  if (todos.length === 0) return null;

  return <TodayTodoList items={todos} />;
}
