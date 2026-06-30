'use client';

import { Check, HeartPulse, Link2, Loader2, Sparkles, Wand2, Zap } from 'lucide-react';
import { useState } from 'react';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlannedSessionMutations, type PlannedSessionPayload } from '@/hooks/use-data';
import type { ProactiveAction } from '@/lib/proactive-coach';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE = {
  danger: 'border-red-500/30 bg-red-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  info: 'border-border bg-card/50',
};

export function ProactiveActionsCard({ actions }: { actions: ProactiveAction[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [adaptFocus, setAdaptFocus] = useState<string | undefined>();
  const { update, remove } = usePlannedSessionMutations();
  const [pending, setPending] = useState<string | null>(null);

  const visible = actions.filter((a) => !dismissed.has(a.id) && !done.has(a.id));

  if (visible.length === 0) return null;

  async function applyAction(action: ProactiveAction) {
    setPending(action.id);
    try {
      if (action.kind === 'downgrade_session' && action.sessionId && action.patch) {
        const data: Partial<PlannedSessionPayload> = {};
        if (action.patch.intensity) data.intensity = action.patch.intensity;
        if (action.patch.load != null) data.load = action.patch.load;
        if (action.patch.title) data.title = action.patch.title;
        if (action.patch.description) data.description = action.patch.description;
        await update.mutateAsync({ id: action.sessionId, data });
        setDone((prev) => new Set(prev).add(action.id));
      } else if (action.kind === 'remove_session' && action.sessionId) {
        await remove.mutateAsync(action.sessionId);
        setDone((prev) => new Set(prev).add(action.id));
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
        <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wider uppercase">
          <Zap className="text-primary size-4" />
          Actions du coach
        </h2>
        <div className="space-y-2">
          {visible.map((action) => (
            <Card key={action.id} className={cn('border', SEVERITY_STYLE[action.severity])}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-muted-foreground text-sm">{action.detail}</p>
                <ActionButtons
                  action={action}
                  pending={pending === action.id}
                  onApply={() => applyAction(action)}
                  onDismiss={() => setDismissed((prev) => new Set(prev).add(action.id))}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {adaptOpen && (
        <PlanAdapterWithFocus
          focus={adaptFocus}
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

function ActionButtons({
  action,
  pending,
  onApply,
  onDismiss,
}: {
  action: ProactiveAction;
  pending: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  if (action.kind === 'physical_checkin' && action.noteId) {
    return (
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/body" size="sm">
          <HeartPulse className="size-3.5" />
          Mettre à jour le suivi
        </LinkButton>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Ignorer
        </Button>
      </div>
    );
  }

  if (action.kind === 'link_session' && action.sessionId) {
    return (
      <div className="flex flex-wrap gap-2">
        <LinkButton href="/planning" size="sm">
          <Link2 className="size-3.5" />
          Aller au planning
        </LinkButton>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Ignorer
        </Button>
      </div>
    );
  }

  if (action.kind === 'info') {
    return (
      <Button size="sm" variant="ghost" onClick={onDismiss}>
        OK
      </Button>
    );
  }

  const label =
    action.kind === 'downgrade_session'
      ? 'Alléger en 1 clic'
      : action.kind === 'remove_session'
        ? 'Supprimer la séance'
        : action.kind === 'open_adapt'
          ? 'Réadapter le plan'
          : action.kind === 'open_plan_generator'
            ? 'Générer des séances'
            : 'Appliquer';

  const Icon =
    action.kind === 'open_adapt' ? Wand2 : action.kind === 'open_plan_generator' ? Sparkles : Check;

  return (
    <div className="flex flex-wrap gap-2">
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

/** Wrapper minimal : pré-remplit le focus via state local au montage. */
function PlanAdapterWithFocus({ focus, onClose }: { focus?: string; onClose: () => void }) {
  return <PlanAdapter initialFocus={focus} onClose={onClose} />;
}
