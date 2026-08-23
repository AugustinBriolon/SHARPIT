'use client';

import { useEffect, useId, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClientPlannedSession } from '@/lib/query/types';
import { plannedDayKey } from '@/lib/training/thread/session-adjust';

/**
 * Choosing when a session moves to, rather than nudging it a day at a time.
 *
 * "Décaler" used to write +1 day on sight. That is right often enough to feel
 * clever and wrong often enough to be annoying: a session pushed off Tuesday
 * usually lands on Thursday, not Wednesday, and getting there meant pressing the
 * same button twice and undoing when it overshot.
 *
 * Both fields are prefilled with where the session already is, so confirming
 * without touching anything is a no-op rather than a surprise.
 *
 * Day and time are two columns and are edited as two. `date` is a `@db.Date` —
 * a calendar day parked at UTC midnight — while the hour the athlete reads lives
 * in `startTime` as "HH:mm". Composing them into one instant would show 02:00 for
 * a session displayed at 18:00, and write a time nothing else reads.
 */

/** `null` when the value is not the shape a `<input type="date">` produces. */
export function parseDayInput(value: string): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  if (month > 12 || day > 31) return null;
  return { year, month, day };
}

export function ThreadShiftDialog({
  session,
  open,
  onOpenChange,
  onConfirm,
}: {
  session: ClientPlannedSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (day: { year: number; month: number; day: number }, startTime: string | null) => void;
}) {
  const dateId = useId();
  const timeId = useId();

  /* The stored day is a `@db.Date` — read it in UTC or the calendar day drifts.
     The clock is a separate column already written as the athlete reads it. */
  const [dateValue, setDateValue] = useState(() => plannedDayKey(session.date));
  const [timeValue, setTimeValue] = useState(() => session.startTime ?? '');

  /* Reopening after a move must show where the session is now, not where it was
     when this component first mounted. */
  useEffect(() => {
    if (!open) return;
    setDateValue(plannedDayKey(session.date));
    setTimeValue(session.startTime ?? '');
  }, [open, session.date, session.startTime]);

  const day = parseDayInput(dateValue);
  const startTime = timeValue.trim() || null;
  const unchanged =
    day != null &&
    dateValue === plannedDayKey(session.date) &&
    startTime === (session.startTime ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Décaler la séance</DialogTitle>
          <DialogDescription>{session.title ?? 'Séance prévue'}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={dateId}>Date</Label>
            <Input
              id={dateId}
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={timeId}>Heure</Label>
            <Input
              id={timeId}
              type="time"
              value={timeValue}
              onChange={(event) => setTimeValue(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {/* Confirming the session's own date would announce a move that did
              not happen. */}
          <Button
            disabled={day == null || unchanged}
            type="button"
            onClick={() => {
              if (!day) return;
              onConfirm(day, startTime);
              onOpenChange(false);
            }}
          >
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
