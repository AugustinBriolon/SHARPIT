'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CalendarRange, ChevronDown, Sparkles, Wand2 } from 'lucide-react';

export function PlanningCoachMenu({
  onGenerate,
  onAdapt,
  onMacroPlan,
}: {
  onGenerate: () => void;
  onAdapt: () => void;
  onMacroPlan: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <Sparkles className="size-4" />
            Coach
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Aide du coach</DropdownMenuLabel>
          <DropdownMenuItem onClick={onGenerate}>
            <Sparkles className="size-4" />
            <div>
              <p className="font-medium">Remplir ma semaine</p>
              <p className="text-muted-foreground text-xs">Nouvelles séances à ajouter</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAdapt}>
            <Wand2 className="size-4" />
            <div>
              <p className="font-medium">Ajuster l&apos;existant</p>
              <p className="text-muted-foreground text-xs">Modifier ce qui est déjà planifié</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMacroPlan}>
            <CalendarRange className="size-4" />
            <div>
              <p className="font-medium">Plan jusqu&apos;à la course</p>
              <p className="text-muted-foreground text-xs">Phases et charge cible</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
