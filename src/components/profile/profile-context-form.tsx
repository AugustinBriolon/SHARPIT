'use client';

import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCoachContext, useSaveCoachContext } from '@/hooks/use-coach';

const PLACEHOLDER = `Ex. :
- En télétravail le lundi et le jeudi → plus de dispo pour les grosses séances ou les bricks ces jours-là.
- Pas plus de 45 min le mardi midi.
- Je préfère nager tôt le matin.
- Charge de travail intense en ce moment, garder de la marge.`;

export function ProfileContextForm() {
  const { data, isPending } = useCoachContext();
  const save = useSaveCoachContext();
  const [value, setValue] = useState('');
  const [syncedFrom, setSyncedFrom] = useState<string | undefined>(undefined);
  const [justSaved, setJustSaved] = useState(false);

  if (data !== undefined && data !== syncedFrom) {
    setSyncedFrom(data);
    setValue(data);
  }

  const dirty = (data ?? '') !== value;

  function handleSave() {
    save.mutate(value, {
      onSuccess: () => {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      },
    });
  }

  return (
    <div className="space-y-3">
      {isPending ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          <Textarea
            className="resize-y text-sm"
            placeholder={PLACEHOLDER}
            rows={8}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Utilisé par le chat, la génération de semaine et l&apos;adaptation du plan.
            </p>
            <div className="flex items-center gap-2">
              {justSaved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="size-3.5" /> Enregistré
                </span>
              )}
              <Button disabled={!dirty || save.isPending} size="sm" onClick={handleSave}>
                {save.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
          {save.isError && <p className="text-destructive text-xs">{save.error.message}</p>}
        </>
      )}
    </div>
  );
}
