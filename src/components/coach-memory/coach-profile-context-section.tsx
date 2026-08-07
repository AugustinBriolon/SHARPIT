'use client';

import { Check, ChevronDown, Loader2, Pencil } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CoachContextGuide } from '@/components/coach-memory/coach-context-guide';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveCoachContext } from '@/hooks/use-coach';
import { cn } from '@/lib/utils';

const PLACEHOLDER = `Ex. :
- En télétravail le lundi et le jeudi → plus de dispo pour les grosses séances ou les bricks ces jours-là.
- Pas plus de 45 min le mardi midi.
- Je préfère nager tôt le matin.
- Charge de travail intense en ce moment, garder de la marge.`;

const EMPTY_HINT =
  'Aucune préférence enregistrée. Ajoute contraintes horaires, habitudes et contexte pro.';

/** Collapsed read clamp — content shorter than this stays fully visible. */
const READ_MAX_COLLAPSED_CLASS = 'max-h-40';
const READ_MAX_COLLAPSED_PX = 160; // matches max-h-40 (10rem)

/** Edit: grows with text until this cap, then scrolls. */
const EDIT_MAX_CLASS = 'max-h-64 min-h-32';

function ContextReadClamp({ text, empty }: { text: string; empty: boolean }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      setOverflows(el.scrollHeight > READ_MAX_COLLAPSED_PX + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, empty]);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  const clamped = overflows && !expanded;

  return (
    <div>
      <div className="relative">
        <div
          className={cn(
            'border-analysis-border bg-background/60 rounded-analysis border px-3 py-3 text-sm leading-relaxed',
            empty ? 'text-muted-foreground italic' : 'text-foreground',
            clamped &&
              cn(
                READ_MAX_COLLAPSED_CLASS,
                'overflow-hidden',
                '[mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_100%)]',
              ),
          )}
        >
          <div ref={contentRef}>
            {empty ? <p>{EMPTY_HINT}</p> : <p className="whitespace-pre-wrap">{text}</p>}
          </div>
        </div>

        {clamped ? (
          <div
            className="from-analysis-surface-alt pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      {overflows ? (
        <button
          aria-expanded={expanded}
          className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 text-xs font-medium"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Réduire' : 'Voir plus'}
          <ChevronDown
            className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}

export function CoachProfileContextSection({
  savedContext,
  loading = false,
  loadError = null,
}: {
  savedContext: string;
  loading?: boolean;
  loadError?: string | null;
}) {
  const save = useSaveCoachContext();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [editValue, setEditValue] = useState(savedContext);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (mode === 'read') setEditValue(savedContext);
  }, [savedContext, mode]);

  const dirty = mode === 'edit' && savedContext !== editValue;
  const hasContent = savedContext.trim().length > 0;

  function handleEdit() {
    setEditValue(savedContext);
    setMode('edit');
  }

  function handleCancel() {
    setEditValue(savedContext);
    setMode('read');
  }

  function handleSave() {
    save.mutate(editValue, {
      onSuccess: () => {
        setJustSaved(true);
        setMode('read');
        setTimeout(() => setJustSaved(false), 2000);
      },
    });
  }

  function renderBody() {
    if (loadError) {
      return <p className="text-destructive text-sm">{loadError}</p>;
    }
    if (loading) {
      return (
        <div className="text-muted-foreground flex min-h-16 items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Chargement…
        </div>
      );
    }

    if (mode === 'edit') {
      return (
        <Textarea
          aria-label="Préférences durables pour le coach"
          placeholder={PLACEHOLDER}
          value={editValue}
          className={cn(
            EDIT_MAX_CLASS,
            'bg-primary/5 border-primary/30 w-full resize-none overflow-y-auto p-3 text-sm leading-relaxed',
          )}
          autoFocus
          onChange={(e) => setEditValue(e.target.value)}
        />
      );
    }

    return <ContextReadClamp empty={!hasContent} text={savedContext} />;
  }

  return (
    <section
      className="analysis-panel-alt rounded-analysis-lg space-y-4 px-5 py-5"
      id="memory-profile-context"
    >
      <div>
        <p className="text-label mb-2">Durable</p>
        <h2 className="text-section-title">Préférences & disponibilités</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Contraintes pro, habitudes et créneaux — ce qui ne change pas chaque semaine.
        </p>
      </div>

      {renderBody()}

      {!loadError && !loading ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            Chat, génération de semaine, adaptation du plan.
          </p>
          {mode === 'read' ? (
            <div className="flex items-center gap-2">
              {justSaved ? (
                <span
                  aria-live="polite"
                  className="text-primary inline-flex items-center gap-1 text-xs"
                >
                  <Check className="size-3.5" aria-hidden />
                  Enregistré
                </span>
              ) : null}
              <Button type="button" variant="outline" onClick={handleEdit}>
                <Pencil className="size-3.5" aria-hidden />
                Modifier
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Annuler
              </Button>
              <Button disabled={!dirty || save.isPending} type="button" onClick={handleSave}>
                {save.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                Enregistrer
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {save.isError ? (
        <p aria-live="assertive" className="text-destructive text-xs" role="alert">
          {save.error.message}
        </p>
      ) : null}

      <CoachContextGuide />
    </section>
  );
}
