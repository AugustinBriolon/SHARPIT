'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  CalendarRange,
  ChevronDown,
  LandPlot,
  NotebookText,
  PenLine,
  Plus,
  Sparkles,
  Wand2,
} from 'lucide-react';

export type SessionsCoachAction = 'plan' | 'manual' | 'generate' | 'adapt' | 'macro' | 'week-brief';

export function SessionsCoachMenu({
  onAction,
}: {
  onAction: (action: SessionsCoachAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="shrink-0" variant="outline">
            <Sparkles className="size-4" />
            <span className="hidden lg:block">Coach</span>
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onAction('plan')}>
            <Plus className="size-4" />
            <div>
              <p className="font-medium">Planifier une séance</p>
              <p className="text-muted-foreground text-xs">Ajouter au planning ou au calendrier</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onAction('manual')}>
            <PenLine className="size-4" />
            <div>
              <p className="font-medium">Saisir une séance</p>
              <p className="text-muted-foreground text-xs">
                Enregistrement manuel d&apos;une activité
              </p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Aide du coach</DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onAction('week-brief')}>
            <NotebookText className="size-4" />
            <div>
              <p className="font-medium">Ma semaine</p>
              <p className="text-muted-foreground text-xs">
                Objectif, charge et séances clés expliqués
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onAction('generate')}>
            <CalendarRange className="size-4" />
            <div>
              <p className="font-medium">Remplir ma semaine</p>
              <p className="text-muted-foreground text-xs">Nouvelles séances à ajouter</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onAction('adapt')}>
            <Wand2 className="size-4" />
            <div>
              <p className="font-medium">Ajuster l&apos;existant</p>
              <p className="text-muted-foreground text-xs">Modifier ce qui est déjà planifié</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onAction('macro')}>
            <LandPlot className="size-4" />
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
