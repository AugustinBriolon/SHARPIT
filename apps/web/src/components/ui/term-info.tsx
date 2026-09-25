'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GLOSSARY, type GlossaryKey } from '@/lib/glossary';
import { cn } from '@/lib/utils';

/**
 * The definition, one tap from the word itself.
 *
 * A glossary at the foot of the page asks the athlete to hold an acronym in his
 * head while he scrolls to find it, then scroll back. This puts the answer where
 * the question is raised, and stays out of the reading otherwise — it is an icon,
 * not a sentence, so a screen that has already been understood is not carrying
 * its own footnotes.
 */
export function TermInfo({ term, className }: { term: GlossaryKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[term];

  return (
    <>
      <button
        aria-label={`Que veut dire ${entry.term} ?`}
        type="button"
        className={cn(
          'text-muted-foreground/60 hover:text-foreground focus-visible:outline-ring',
          'inline-flex shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2',
          className,
        )}
        onClick={(event) => {
          // Often sits inside a card that is itself a button or a link.
          event.stopPropagation();
          event.preventDefault();
          setOpen(true);
        }}
      >
        <Info className="size-3.5" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{entry.term}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{entry.definition}</DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
