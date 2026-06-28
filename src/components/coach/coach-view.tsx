"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { CoachChat } from "@/components/coach/coach-chat";
import { CoachContextPanel } from "@/components/coach/coach-context-panel";
import { PlanGenerator } from "@/components/coach/plan-generator";
import { Button } from "@/components/ui/button";

export function CoachView() {
  const [generatorOpen, setGeneratorOpen] = useState(false);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Coach IA
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
            Ton coach personnel
          </h1>
          <p className="mt-1 text-muted-foreground">
            Discute avec ton coach ou laisse-le construire tes prochaines
            séances à partir de tes données.
          </p>
        </div>
        <Button onClick={() => setGeneratorOpen(true)}>
          <Sparkles className="size-4" />
          Générer ma semaine
        </Button>
      </header>

      <CoachContextPanel />

      <CoachChat />

      {generatorOpen && (
        <PlanGenerator onClose={() => setGeneratorOpen(false)} />
      )}
    </div>
  );
}
