'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, ChevronRight, Layers, Pencil } from 'lucide-react';
import Link from 'next/link';
import { BrickAnalysisPanel } from '@/components/planning/brick-analysis-panel';
import { SessionRealization } from '@/components/planning/session-realization';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels } from '@/lib/format';
import { intensityAccent } from '@/lib/sessions';
import { cn } from '@/lib/utils';

interface BrickDialogProps {
  sessions: ClientPlannedSession[];
  onClose: () => void;
  onEditLeg: (session: ClientPlannedSession) => void;
}

export function BrickDialog({ sessions, onClose, onEditLeg }: BrickDialogProps) {
  const ordered = [...sessions].sort((a, b) => (a.brickOrder ?? 0) - (b.brickOrder ?? 0));
  const brickGroupId = ordered[0]?.brickGroupId;
  const date = ordered[0]?.date ? new Date(ordered[0].date) : null;
  const totalMin = ordered.reduce((sum, p) => sum + (p.durationMin ?? 0), 0);
  const allDone = ordered.every((p) => p.completed && Boolean(p.activityId));
  const sequence = ordered.map((p) => activityTypeLabels[p.type]).join(' → ');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="text-primary size-5 shrink-0" />
            Brick
            {allDone && (
              <span className="text-muted-foreground text-sm font-normal">· réalisé</span>
            )}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{sequence}</p>
          {date && (
            <p className="text-muted-foreground text-xs capitalize">
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
              {totalMin > 0 && ` · ${totalMin} min planifiées`}
            </p>
          )}
        </DialogHeader>

        {brickGroupId && <BrickAnalysisPanel brickGroupId={brickGroupId} />}

        <div className="space-y-4">
          {ordered.map((session, index) => (
            <BrickLegSection
              key={session.id}
              index={index}
              session={session}
              showConnector={index < ordered.length - 1}
              onEdit={() => onEditLeg(session)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BrickLegSection({
  session,
  index,
  showConnector,
  onEdit,
}: {
  session: ClientPlannedSession;
  index: number;
  showConnector: boolean;
  onEdit: () => void;
}) {
  const accent = session.intensity ? intensityAccent[session.intensity] : '#94a3b8';
  const done = session.completed && Boolean(session.activityId);
  const label = session.title ?? activityTypeLabels[session.type];

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${accent}22`, color: accent }}
        >
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium">{label}</p>
            <span className="text-muted-foreground text-xs">
              {activityTypeLabels[session.type]}
            </span>
            {session.durationMin != null && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {session.durationMin} min
              </span>
            )}
            {done && (
              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                <Check className="size-3" />
                Liée
              </span>
            )}
          </div>

          {session.activityId && (
            <Link
              className="text-primary mt-0.5 inline-block text-xs hover:underline"
              href={`/training/${session.activityId}`}
            >
              Voir l&apos;activité réalisée →
            </Link>
          )}
        </div>

        <Button className="shrink-0" size="sm" type="button" variant="ghost" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Planifier
        </Button>
      </div>

      <div className="border-border/60 ml-3 border-l pl-5">
        <SessionRealization session={session} />
      </div>

      {showConnector && (
        <div className="text-primary/50 ml-3 flex items-center gap-1 pl-5 text-xs">
          <ChevronRight className="size-3.5" />
          Transition
        </div>
      )}
    </div>
  );
}

/**
 * En-tête compact pour le calendrier : clic → vue brick complète.
 */
export function BrickChipHeader({
  totalMin,
  allDone,
  onOpen,
}: {
  totalMin: number;
  allDone: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      title="Voir le brick"
      type="button"
      className={cn(
        'hover:bg-primary/10 mb-0.5 flex w-full items-center gap-1 rounded px-0.5 py-0.5 text-left transition-colors',
        allDone && 'opacity-90',
      )}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <Layers className="text-primary size-2.5 shrink-0" />
      <span className="text-primary text-[9px] font-semibold tracking-wider uppercase">Brick</span>
      {totalMin > 0 && (
        <span className="text-muted-foreground ml-auto shrink-0 text-[9px] tabular-nums">
          {totalMin} min
        </span>
      )}
    </button>
  );
}
