'use client';

import { NavArrowDown } from '@/components/icons/nav-arrows';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CalendarRange, NotebookText, SlidersHorizontal } from 'lucide-react';

/** Week-chrome tools only — create/manual/bilan/macro live on day + / hub Plan. */
export type SessionsCoachAction = 'generate' | 'adapt';

/** Semaine entry for Remplir / Ajuster — intention « Coacher mon objectif ». */
export function SessionsCoachMenu({
  onAction,
  tone = 'primary',
}: {
  onAction: (action: SessionsCoachAction) => void;
  /** Calendar view uses secondary so Coach does not compete with the week strip. */
  tone?: 'primary' | 'secondary';
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="shrink-0 gap-1.5 font-semibold"
            size={tone === 'secondary' ? 'sm' : 'default'}
            variant={tone === 'secondary' ? 'outline' : 'default'}
          >
            <NotebookText className="size-4" />
            <span className={tone === 'secondary' ? 'hidden sm:inline' : 'hidden lg:inline'}>
              Coacher
            </span>
            <NavArrowDown className="size-3.5 opacity-70 transition-transform duration-150 ease-out group-aria-expanded/button:rotate-180" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="analysis-panel-alt border-foreground/18 rounded-analysis-lg w-72 border p-1.5 ring-0"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Coacher mon objectif</DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 py-2"
            onClick={() => onAction('generate')}
          >
            <CalendarRange className="text-foreground/70 size-4" />
            <div className="min-w-0">
              <p className="font-medium">Remplir ma semaine</p>
              <p className="text-muted-foreground text-xs">
                Proposer les prochaines séances concrètes
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2.5 py-2"
            onClick={() => onAction('adapt')}
          >
            <SlidersHorizontal className="text-foreground/70 size-4" />
            <div className="min-w-0">
              <p className="font-medium">Ajuster le planning</p>
              <p className="text-muted-foreground text-xs">Réarranger ce qui est déjà prévu</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
