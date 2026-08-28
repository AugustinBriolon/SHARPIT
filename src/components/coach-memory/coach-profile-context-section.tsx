'use client';

import { Check, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CoachContextGuide } from '@/components/coach-memory/coach-context-guide';
import { CoachProfileContextHeader } from '@/components/coach-memory/coach-profile-context-header';
import { ContextReadClamp } from '@/components/coach-memory/coach-profile-context-read';
import { MotionExpand } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSaveCoachContext } from '@/hooks/use-coach';
import { useDesktopAutofocus } from '@/hooks/use-desktop-autofocus';
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

const GUIDE_ID = 'coach-context-guide';
const EDIT_MAX_CLASS = 'max-h-64 min-h-32';

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

function ContextReadBody({
  hasContent,
  savedContext,
}: {
  hasContent: boolean;
  savedContext: string;
}) {
  if (hasContent && shouldRenderAsBullets(savedContext)) {
    return <ContextBulletList items={parseDurablePreferences(savedContext)} />;
  }
  return <ContextReadClamp empty={!hasContent} emptyHint={EMPTY_HINT} text={savedContext} />;
}

function ContextEditBody({
  editRef,
  editValue,
  onChange,
}: {
  editRef: React.RefObject<HTMLTextAreaElement | null>;
  editValue: string;
  onChange: (value: string) => void;
}) {
  return (
    <Textarea
      ref={editRef}
      aria-label="Préférences durables pour le coach"
      placeholder={PLACEHOLDER}
      value={editValue}
      className={cn(
        EDIT_MAX_CLASS,
        'bg-primary/5 border-primary/30 w-full resize-none overflow-y-auto p-3 text-sm leading-relaxed',
      )}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ContextSavedBadge() {
  return (
    <span aria-live="polite" className="text-primary inline-flex items-center gap-1 text-xs">
      <Check className="size-3.5" aria-hidden />
      Enregistré
    </span>
  );
}

function ContextEditActions({
  dirty,
  guardDisabled,
  offline,
  offlineLabel,
  pending,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  guardDisabled: boolean;
  offline: boolean;
  offlineLabel: string;
  pending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Annuler
      </Button>
      <Button disabled={guardDisabled || !dirty || pending} type="button" onClick={onSave}>
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {offline ? offlineLabel : 'Enregistrer'}
      </Button>
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
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [editValue, setEditValue] = useState(savedContext);
  const [justSaved, setJustSaved] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  useDesktopAutofocus(editRef, mode === 'edit');

  useEffect(() => {
    if (mode === 'read') {
      setEditValue(savedContext);
    }
  }, [savedContext, mode]);

  const dirty = mode === 'edit' && savedContext !== editValue;
  const hasContent = savedContext.trim().length > 0;

  function handleSave() {
    if (guardDisabled) {
      return;
    }
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
      return <ContextEditBody editRef={editRef} editValue={editValue} onChange={setEditValue} />;
    }
    return <ContextReadBody hasContent={hasContent} savedContext={savedContext} />;
  }

  function renderFooterAction() {
    if (mode === 'read') {
      return justSaved ? <ContextSavedBadge /> : null;
    }
    return (
      <ContextEditActions
        dirty={dirty}
        guardDisabled={guardDisabled}
        offline={offline}
        offlineLabel={offlineLabel}
        pending={save.isPending}
        onSave={handleSave}
        onCancel={() => {
          setEditValue(savedContext);
          setMode('read');
        }}
      />
    );
  }

  function startEdit() {
    setEditValue(savedContext);
    setMode('edit');
  }

  return (
    <section className="space-y-3" id="memory-profile-context">
      <CoachProfileContextHeader
        guideId={GUIDE_ID}
        guideOpen={guideOpen}
        loadError={loadError}
        loading={loading}
        mode={mode}
        onEdit={startEdit}
        onToggleGuide={() => setGuideOpen((open) => !open)}
      />

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
