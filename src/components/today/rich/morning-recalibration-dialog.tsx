'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/query/keys';
import { cn } from '@/lib/utils';

export type MorningRecalibrationProposalView = {
  decisionId: string;
  sessionId: string;
  direction: 'DOWN' | 'UP';
  changeSummary: string;
  why: string;
  status?: 'PRESENTED' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED' | 'EXPIRED';
};

/**
 * ActionRow affordance — opens a confirm modal for morning session recalibration.
 * Silence after accept/reject (parent refetch clears the prop).
 */
export function MorningRecalibrationDialog({
  proposal,
  trainingDayId,
  onSettled,
}: {
  proposal: MorningRecalibrationProposalView;
  trainingDayId: string;
  onSettled?: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<'accept' | 'reject' | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isDown = proposal.direction === 'DOWN';
  const triggerLabel = isDown ? 'Confirmer l’allègement' : 'Ajuster · opportunité';
  const title = isDown ? 'Confirmer l’allègement ?' : 'Monter la séance ?';

  async function act(action: 'accept' | 'reject') {
    setPending(action);
    try {
      const res = await fetch('/api/morning-recalibration/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId: proposal.decisionId, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Action impossible');
        return;
      }
      setDismissed(true);
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.plannedSessions }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.presentationToday(trainingDayId),
        }),
      ]);
      toast.success(action === 'accept' ? 'Ajustement appliqué' : 'Séance conservée telle quelle');
      onSettled?.();
    } catch {
      toast.error('Action impossible');
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          isDown &&
            'border-signal-caution/50 bg-signal-caution/10 text-foreground hover:bg-signal-caution/18',
          !isDown && 'border-primary/45 bg-primary/10 text-foreground hover:bg-primary/18',
        )}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-3" aria-hidden />
        {triggerLabel}
      </Button>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 border-b px-5 py-4 text-left">
          <DialogTitle className="font-heading text-lg">{title}</DialogTitle>
          <DialogDescription>
            Proposition du matin — tu confirmes avant toute modification du plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div
            className={cn(
              'rounded-analysis border px-3 py-3',
              isDown
                ? 'border-signal-caution/35 bg-signal-caution/5'
                : 'border-primary/30 bg-primary/5',
            )}
          >
            <p className="text-label">{isDown ? 'Prudence' : 'Opportunité'}</p>
            <p className="text-foreground mt-1.5 text-sm leading-relaxed font-medium">
              {proposal.changeSummary}
            </p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">{proposal.why}</p>
        </div>

        <div className="border-border/60 bg-muted/40 flex flex-col gap-2 border-t px-5 py-4 sm:flex-row-reverse">
          <Button
            className="w-full sm:flex-1"
            disabled={pending != null}
            type="button"
            onClick={() => void act('accept')}
          >
            {pending === 'accept' ? '…' : 'Appliquer l’ajustement'}
          </Button>
          <Button
            className="w-full sm:flex-1"
            disabled={pending != null}
            type="button"
            variant="outline"
            onClick={() => void act('reject')}
          >
            {pending === 'reject' ? '…' : 'Garder la séance'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
