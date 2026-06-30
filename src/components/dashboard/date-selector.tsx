'use client';

import { addDays, format, isSameDay, isToday, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function toInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DateSelector({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const today = isToday(date);

  return (
    <div className="flex items-center gap-2">
      {!today && (
        <Button size="sm" type="button" variant="ghost" onClick={() => onChange(new Date())}>
          Aujourd&apos;hui
        </Button>
      )}

      <Button
        aria-label="Jour précédent"
        size="icon"
        type="button"
        variant="outline"
        onClick={() => onChange(subDays(date, 1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <label className="border-border/60 bg-card/50 hover:border-primary/30 relative flex h-8 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium capitalize">
        {format(date, 'EEE d MMM yyyy', { locale: fr })}
        <input
          aria-label="Choisir une date"
          className="absolute inset-0 cursor-pointer opacity-0"
          max={toInputValue(addDays(new Date(), 1))}
          type="date"
          value={toInputValue(date)}
          onChange={(e) => {
            if (e.target.value) onChange(new Date(`${e.target.value}T12:00:00`));
          }}
        />
      </label>

      <Button
        aria-label="Jour suivant"
        disabled={isSameDay(date, new Date())}
        size="icon"
        type="button"
        variant="outline"
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
