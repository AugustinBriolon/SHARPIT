'use client';

import { useState } from 'react';
import {
  mfpImportFileProblem,
  mfpImportSummary,
} from '@/components/nutrition/food-log/mfp-import-summary';
import type { MfpImportView } from '@/components/nutrition/food-log/mfp-import-dialog';
import { useImportMfpExport } from '@/hooks/use-data';

/** The import dialog: open state, a file checked then sent, and what came back. */
export function useMfpImport() {
  const upload = useImportMfpExport();
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const view: MfpImportView = {
    open,
    pending: upload.isPending,
    error: problem ?? (upload.error instanceof Error ? upload.error.message : null),
    summary: upload.data ? mfpImportSummary(upload.data) : null,
  };

  return {
    view,
    setOpen: (next: boolean) => {
      if (next) {
        upload.reset();
        setProblem(null);
      }
      setOpen(next);
    },
    send: (file: File) => {
      const refused = mfpImportFileProblem(file);
      setProblem(refused);
      if (!refused) {
        upload.mutate(file);
      }
    },
  };
}
