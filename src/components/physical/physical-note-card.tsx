'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Pencil, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ClientPhysicalNote } from '@/lib/client/types';
import {
  categoryLabels,
  severityAccent,
  severityColor,
  sideLabels,
  statusColors,
  statusLabels,
} from '@/lib/physical';
import { cn } from '@/lib/utils';
import { usePhysicalNoteMutations } from '@/hooks/use-physical';

export function PhysicalNoteCard({
  note,
  onEdit,
}: {
  note: ClientPhysicalNote;
  onEdit: () => void;
}) {
  const { addCheckin } = usePhysicalNoteMutations();
  const [open, setOpen] = useState(false);
  const [newSeverity, setNewSeverity] = useState<number>(note.severity ?? 3);
  const [comment, setComment] = useState('');

  // checkins du plus ancien au plus récent pour le graphe
  const series = [...note.checkins]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((c) => ({
      date: format(new Date(c.date), 'd MMM', { locale: fr }),
      severity: c.severity,
      comment: c.comment,
    }));

  const trend =
    note.checkins.length >= 2
      ? (() => {
          const last = note.checkins[0]?.severity;
          const prev = note.checkins[1]?.severity;
          if (last == null || prev == null) return null;
          if (last < prev) return 'down' as const;
          if (last > prev) return 'up' as const;
          return 'flat' as const;
        })()
      : null;

  // checkins triés du plus récent au plus ancien (ordre API) : [0] = dernier
  const lastCheckin = note.checkins[0] ?? null;
  const lastCheckinAgo = lastCheckin
    ? formatDistanceToNow(new Date(lastCheckin.date), {
        locale: fr,
        addSuffix: true,
      })
    : null;

  async function handleCheckin() {
    await addCheckin.mutateAsync({
      id: note.id,
      data: { severity: newSeverity, comment: comment.trim() || null },
    });
    setComment('');
  }

  return (
    <Card className={cn(note.status === 'RESOLVED' && 'opacity-70')}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{categoryLabels[note.category]}</Badge>
            <span className={cn('text-xs font-medium', statusColors[note.status])}>
              {statusLabels[note.status]}
            </span>
            {!note.affectsTraining && (
              <span className="text-muted-foreground text-xs">(hors coach)</span>
            )}
          </div>
          <h3 className="font-heading text-base font-medium">{note.title}</h3>
          <p className="text-muted-foreground text-xs">
            {note.bodyPart && (
              <>
                {note.bodyPart}
                {note.side !== 'NA' ? ` (${sideLabels[note.side]})` : ''} ·{' '}
              </>
            )}
            Depuis le {format(new Date(note.startDate), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {note.severity != null && (
            <div className="text-right">
              <p
                className={cn(
                  'font-mono text-2xl leading-none font-semibold',
                  severityColor(note.severity),
                )}
              >
                {note.severity}
              </p>
              <p className="text-muted-foreground text-[10px]">/10</p>
            </div>
          )}
          {trend === 'down' && <TrendingDown className="size-4 text-emerald-600" />}
          {trend === 'up' && <TrendingUp className="size-4 text-red-600" />}
          <button
            aria-label="Modifier"
            className="text-muted-foreground hover:text-foreground"
            type="button"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {note.description && <p className="text-muted-foreground text-sm">{note.description}</p>}

        {series.length >= 2 && (
          <div className="h-28">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={series} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <CartesianGrid stroke="#00000014" strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #00000014',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#0f172a',
                  }}
                />
                <Line
                  dataKey="severity"
                  dot={{ r: 3 }}
                  stroke={severityAccent(note.severity)}
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <button
          className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 text-xs"
          type="button"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          <span>
            Suivi ({note.checkins.length} point
            {note.checkins.length > 1 ? 's' : ''})
          </span>
          {lastCheckinAgo && (
            <span className="text-muted-foreground/70 ml-auto">dernier {lastCheckinAgo}</span>
          )}
        </button>

        {open && (
          <div className="border-border/60 space-y-3 border-t pt-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs">
                  Sévérité : <span className="font-mono">{newSeverity}/10</span>
                </label>
                <input
                  className="accent-primary block w-40"
                  max={10}
                  min={0}
                  type="range"
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(Number(e.target.value))}
                />
              </div>
              <Input
                className="h-9 flex-1"
                placeholder="Note (optionnel)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button
                disabled={addCheckin.isPending}
                size="sm"
                type="button"
                onClick={handleCheckin}
              >
                <Plus className="size-4" />
                Point
              </Button>
            </div>

            {note.checkins.length > 0 && (
              <ul className="space-y-1.5">
                {note.checkins.map((c) => (
                  <li key={c.id} className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: severityAccent(c.severity) }}
                    />
                    <span className="w-16 shrink-0 tabular-nums">
                      {format(new Date(c.date), 'd MMM', { locale: fr })}
                    </span>
                    {c.severity != null && (
                      <span
                        className={cn(
                          'w-12 shrink-0 font-mono font-medium tabular-nums',
                          severityColor(c.severity),
                        )}
                      >
                        {c.severity}/10
                      </span>
                    )}
                    {c.comment && <span className="truncate">— {c.comment}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
