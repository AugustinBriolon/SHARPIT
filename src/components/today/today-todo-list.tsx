'use client';

import { Check, HeartPulse, Link2, Loader2, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import type { TodayTodoItem } from '@/components/today/today-todo';
import { usePlannedSessionMutations, type PlannedSessionPayload } from '@/hooks/use-data';
import {
  dismissTodo,
  isTodoDismissed,
  loadDismissedTodoHashes,
  todoContentHash,
} from '@/lib/dismissed-todos';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE = {
  danger: 'border-red-500/30 bg-red-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  info: 'border-border bg-card/50',
};

const VISIBLE_MAX = 3;

export function TodayTodoList({ items }: { items: TodayTodoItem[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [dismissStore, setDismissStore] = useState<Record<string, string>>({});
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [adaptFocus, setAdaptFocus] = useState<string | undefined>();
  const { update, remove } = usePlannedSessionMutations();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setDismissStore(loadDismissedTodoHashes());
  }, []);

  const visible = useMemo(
    () =>
      items.filter((i) => {
        if (done.has(i.id)) return false;
        const hash = todoContentHash(i.title, i.detail);
        return !isTodoDismissed(i.id, hash, dismissStore);
      }),
    [items, done, dismissStore],
  );
  const shown = visible.slice(0, VISIBLE_MAX);
  const hidden = visible.length - shown.length;

  function handleDismiss(item: TodayTodoItem) {
    const hash = todoContentHash(item.title, item.detail);
    dismissTodo(item.id, hash);
    setDismissStore((prev) => ({ ...prev, [item.id]: hash }));
  }

  if (shown.length === 0) return null;

  async function applyAction(item: TodayTodoItem) {
    const { action } = item;
    if (!action) return;
    setPending(item.id);
    try {
      if (action.kind === 'downgrade_session' && action.sessionId && action.patch) {
        const data: Partial<PlannedSessionPayload> = {};
        if (action.patch.intensity) data.intensity = action.patch.intensity;
        if (action.patch.load != null) data.load = action.patch.load;
        if (action.patch.title) data.title = action.patch.title;
        if (action.patch.description) data.description = action.patch.description;
        await update.mutateAsync({ id: action.sessionId, data });
        setDone((prev) => new Set(prev).add(item.id));
      } else if (action.kind === 'remove_session' && action.sessionId) {
        await remove.mutateAsync(action.sessionId);
        setDone((prev) => new Set(prev).add(item.id));
      } else if (action.kind === 'open_adapt') {
        setAdaptFocus(action.adaptFocus);
        setAdaptOpen(true);
      } else if (action.kind === 'open_plan_generator') {
        setPlanOpen(true);
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            À traiter
          </h2>
          {hidden > 0 && (
            <Link className="text-primary text-xs font-medium hover:underline" href="/coach">
              + {hidden} autre{hidden > 1 ? 's' : ''} dans Coach →
            </Link>
          )}
        </div>
        <div className="space-y-2">
          {shown.map((item, index) => (
            <Card key={item.id} className={cn('border', SEVERITY_STYLE[item.severity])}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-muted-foreground font-mono text-[10px] tabular-nums">
                    {index + 1}.
                  </p>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-sm">{item.detail}</p>
                </div>
                <TodoActions
                  item={item}
                  pending={pending === item.id}
                  onApply={() => applyAction(item)}
                  onDismiss={() => handleDismiss(item)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {adaptOpen && (
        <PlanAdapter
          initialFocus={adaptFocus}
          onClose={() => {
            setAdaptOpen(false);
            setAdaptFocus(undefined);
          }}
        />
      )}
      {planOpen && <PlanGenerator onClose={() => setPlanOpen(false)} />}
    </>
  );
}

function TodoActions({
  item,
  pending,
  onApply,
  onDismiss,
}: {
  item: TodayTodoItem;
  pending: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const { action } = item;

  if (action?.kind === 'physical_checkin' && action.noteId) {
    return (
      <div className="flex shrink-0 flex-wrap gap-2">
        <LinkButton href="/corps?tab=suivi" size="sm">
          <HeartPulse className="size-3.5" />
          Check-in
        </LinkButton>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Ignorer
        </Button>
      </div>
    );
  }

  if (action?.kind === 'link_session' && action.sessionId) {
    return (
      <div className="flex shrink-0 flex-wrap gap-2">
        <LinkButton href="/seances?tab=planning" size="sm">
          <Link2 className="size-3.5" />
          Lier
        </LinkButton>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Ignorer
        </Button>
      </div>
    );
  }

  if (!action) {
    return (
      <Button className="shrink-0" size="sm" variant="ghost" onClick={onDismiss}>
        OK
      </Button>
    );
  }

  if (action.kind === 'info') {
    return (
      <Button className="shrink-0" size="sm" variant="ghost" onClick={onDismiss}>
        OK
      </Button>
    );
  }

  const label =
    action.kind === 'downgrade_session'
      ? 'Appliquer'
      : action.kind === 'remove_session'
        ? 'Supprimer'
        : action.kind === 'open_adapt'
          ? 'Réadapter'
          : action.kind === 'open_plan_generator'
            ? 'Générer'
            : 'Appliquer';

  const Icon =
    action.kind === 'open_adapt' ? Wand2 : action.kind === 'open_plan_generator' ? Sparkles : Check;

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button disabled={pending} size="sm" onClick={onApply}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5" />}
        {label}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDismiss}>
        Ignorer
      </Button>
    </div>
  );
}
