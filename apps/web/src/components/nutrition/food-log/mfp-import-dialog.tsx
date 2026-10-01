'use client';

import { Upload } from 'lucide-react';
import { Button } from '@sharpit/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MFP_IMPORT_ACCEPT } from '@/components/nutrition/food-log/mfp-import-summary';

export type MfpImportView = {
  open: boolean;
  pending: boolean;
  error: string | null;
  /** The lines that report a finished import. */
  summary: string[] | null;
};

/** How to get the export out of MyFitnessPal, then the file picker and what was imported. */
export function MfpImportDialog({
  view,
  onOpenChange,
  onFile,
}: {
  view: MfpImportView;
  onOpenChange: (open: boolean) => void;
  onFile: (file: File) => void;
}) {
  return (
    <Dialog open={view.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Importer depuis MyFitnessPal</DialogTitle>
          <DialogDescription>
            MyFitnessPal Premium : Rapports → Exporter, choisis la période. Tu reçois un e-mail avec
            un fichier ZIP. Importe-le ici tel quel (ou le fichier CSV « Nutrition » qu’il
            contient).
          </DialogDescription>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Le détail des aliments n’est pas dans l’export : SharpIt reprend le total de chaque repas,
          jour par jour. Un jour que tu as noté dans SharpIt garde ta saisie.
        </p>
        <label className="border-border/70 hover:bg-muted/40 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-sm">
          <Upload className="size-4" aria-hidden />
          {view.pending ? 'Import en cours…' : 'Choisir le fichier'}
          <input
            accept={MFP_IMPORT_ACCEPT}
            className="sr-only"
            disabled={view.pending}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                onFile(file);
              }
            }}
          />
        </label>
        {view.error ? <p className="text-destructive text-sm">{view.error}</p> : null}
        {view.summary ? (
          <div aria-live="polite" className="space-y-1 text-sm">
            {view.summary.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
