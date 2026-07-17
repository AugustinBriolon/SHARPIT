'use client';

import { Check, Loader2, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';
import { Textarea } from '@/components/ui/textarea';
import { useSaveCoachContext } from '@/hooks/use-coach';
import { cn } from '@/lib/utils';

const PLACEHOLDER = `Ex. :
- En télétravail le lundi et le jeudi → plus de dispo pour les grosses séances ou les bricks ces jours-là.
- Pas plus de 45 min le mardi midi.
- Je préfère nager tôt le matin.
- Charge de travail intense en ce moment, garder de la marge.`;

const EMPTY_HINT =
  'Aucune préférence enregistrée. Ajoute tes contraintes horaires, habitudes et contexte pro pour guider le coach.';

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
  const [value, setValue] = useState(savedContext);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setValue(savedContext);
    setMode('read');
  }, [savedContext]);

  const dirty = savedContext !== value;
  const hasContent = savedContext.trim().length > 0;

  function handleCancel() {
    setValue(savedContext);
    setMode('read');
  }

  function handleSave() {
    save.mutate(value, {
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
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Chargement…
        </div>
      );
    }

    if (mode === 'read') {
      return (
        <div className="space-y-3">
          <div
            className={cn(
              'rounded-analysis text-sm leading-relaxed',
              hasContent ? 'text-foreground' : 'text-muted-foreground italic',
            )}
          >
            {hasContent ? (
              <p className="whitespace-pre-wrap">{savedContext}</p>
            ) : (
              <p>{EMPTY_HINT}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Utilisé par le chat, la génération de semaine et l&apos;adaptation du plan.
            </p>
            <div className="flex items-center gap-2">
              {justSaved ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" />
                  Enregistré
                </span>
              ) : null}
              <Button size="sm" type="button" variant="outline" onClick={() => setMode('edit')}>
                <Pencil className="size-3.5" />
                Modifier
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <Textarea
          aria-label="Contexte personnel pour le coach"
          className="bg-primary/5 border-primary/30 resize-y text-sm"
          placeholder={PLACEHOLDER}
          rows={8}
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" type="button" variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button disabled={!dirty || save.isPending} size="sm" type="button" onClick={handleSave}>
            {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Enregistrer
          </Button>
        </div>
        {save.isError ? <p className="text-destructive text-xs">{save.error.message}</p> : null}
      </div>
    );
  }

  return (
    <section
      className="analysis-panel-alt rounded-analysis-lg px-5 py-5"
      id="memory-profile-context"
    >
      <EyebrowLabel className="mb-2" variant="section">
        Mémoire persistante
      </EyebrowLabel>
      <div className="mb-4">
        <h2 className="font-heading text-base font-semibold">Disponibilités & préférences</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Contraintes pro, habitudes d&apos;entraînement et préférences de créneaux.
        </p>
      </div>
      {renderBody()}
    </section>
  );
}
