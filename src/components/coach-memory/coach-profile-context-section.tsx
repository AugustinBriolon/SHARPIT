'use client';

import { Check, ChevronDown, Info, Loader2, Pencil } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CoachContextGuide } from '@/components/coach-memory/coach-context-guide';
import { MotionExpand } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveCoachContext } from '@/hooks/use-coach';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import { parseDurablePreferences, shouldRenderAsBullets } from '@/lib/coach-memory/memory-summary';
import { cn } from '@/lib/utils';

const PLACEHOLDER = `Ex. :
- En télétravail le lundi et le jeudi → plus de dispo pour les grosses séances ou les bricks ces jours-là.
- Pas plus de 45 min le mardi midi.
- Je préfère nager tôt le matin.
- Charge de travail intense en ce moment, garder de la marge.`;

const EMPTY_HINT =
  'Aucune préférence enregistrée. Ajoute contraintes horaires, habitudes et contexte pro.';

/** Ties the info toggle to the panel it reveals. */
const GUIDE_ID = 'coach-context-guide';

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
            'text-sm leading-relaxed',
            // DESIGN_LANGUAGE §9.3 — max-height + opacity via CSS, not motion height.
            'transition-[max-height,opacity] duration-[250ms] ease-in-out motion-reduce:transition-none',
            empty ? 'text-muted-foreground italic' : 'text-foreground',
            clamped
              ? cn(
                  READ_MAX_COLLAPSED_CLASS,
                  'overflow-hidden',
                  '[mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_100%)]',
                )
              : 'max-h-[min(80vh,48rem)]',
          )}
        >
          <div ref={contentRef}>
            {empty ? <p>{EMPTY_HINT}</p> : <p className="whitespace-pre-wrap">{text}</p>}
          </div>
        </div>

        {clamped ? (
          <div
            className="from-chip-surface pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t to-transparent"
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
            className={cn(
              'size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}

/** Structured read view — one line per preference, so the layer scans at a glance. */
function ContextBulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="bg-primary mt-[0.5em] size-1.5 shrink-0 rounded-full" aria-hidden />
          <span className="min-w-0 flex-1">{item}</span>
        </li>
      ))}
    </ul>
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
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [editValue, setEditValue] = useState(savedContext);
  const [justSaved, setJustSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

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
    if (guardDisabled) return;
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

    // Unstructured free text keeps the clamped paragraph.
    if (hasContent && shouldRenderAsBullets(savedContext)) {
      return <ContextBulletList items={parseDurablePreferences(savedContext)} />;
    }

    return <ContextReadClamp empty={!hasContent} text={savedContext} />;
  }

  /** Read mode only confirms a save; edit mode carries the commit controls. */
  function renderFooterAction() {
    if (mode === 'read') {
      if (!justSaved) return null;
      return (
        <span aria-live="polite" className="text-primary inline-flex items-center gap-1 text-xs">
          <Check className="size-3.5" aria-hidden />
          Enregistré
        </span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Annuler
        </Button>
        <Button
          disabled={guardDisabled || !dirty || save.isPending}
          type="button"
          onClick={handleSave}
        >
          {save.isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {offline ? offlineLabel : 'Enregistrer'}
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-3" id="memory-profile-context">
      {/* Header sits outside the card — the card holds the preferences only. */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-label text-primary mb-1">Durable</p>
          <h2 className="text-section-title">Préférences & disponibilités</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-controls={GUIDE_ID}
            aria-expanded={guideOpen}
            aria-label="Qu'est-ce qu'un bon contexte ?"
            className="text-muted-foreground"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => setGuideOpen((open) => !open)}
          >
            <Info className="size-4" aria-hidden />
          </Button>
          {!loadError && !loading && mode === 'read' ? (
            <Button type="button" variant="outline" onClick={handleEdit}>
              <Pencil className="size-3.5" aria-hidden />
              Modifier
            </Button>
          ) : null}
        </div>
      </div>

      <MotionExpand id={GUIDE_ID} open={guideOpen}>
        <div className="border-analysis-border rounded-analysis-lg border border-dashed px-5 py-4">
          <CoachContextGuide />
        </div>
      </MotionExpand>

      <div className="chip-surface rounded-analysis-lg px-5 py-5">{renderBody()}</div>

      {!loadError && !loading ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs">
            Utilisé pour le chat, la génération de semaine et l&apos;adaptation du plan.
          </p>
          {renderFooterAction()}
        </div>
      ) : null}

      {save.isError ? (
        <p aria-live="assertive" className="text-destructive text-xs" role="alert">
          {save.error.message}
        </p>
      ) : null}
    </section>
  );
}
