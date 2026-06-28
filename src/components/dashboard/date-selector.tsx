"use client";

import { addDays, format, isSameDay, isToday, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function toInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DateSelector({
  date,
  onChange,
}: {
  date: Date;
  onChange: (date: Date) => void;
}) {
  const today = isToday(date);

  return (
    <div className="flex items-center gap-2">
      {!today && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(new Date())}
        >
          Aujourd&apos;hui
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Jour précédent"
        onClick={() => onChange(subDays(date, 1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <label className="relative flex h-8 cursor-pointer items-center rounded-lg border border-border/60 bg-card/50 px-3 text-sm font-medium capitalize hover:border-primary/30">
        {format(date, "EEE d MMM yyyy", { locale: fr })}
        <input
          type="date"
          value={toInputValue(date)}
          max={toInputValue(addDays(new Date(), 1))}
          onChange={(e) => {
            if (e.target.value) onChange(new Date(`${e.target.value}T12:00:00`));
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Choisir une date"
        />
      </label>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Jour suivant"
        disabled={isSameDay(date, new Date())}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>

     
    </div>
  );
}
