import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { MfpImportResultPayload } from '@sharpit/app/lib/nutrition/food-log/food-log-day';

/** Accepted as picked: the ZIP MyFitnessPal emails, or the nutrition CSV taken out of it. */
export const MFP_IMPORT_ACCEPT = '.csv,.zip,text/csv,application/zip';

/** The server's own limit, checked first so a too-big file fails without an upload. */
export const MFP_IMPORT_MAX_BYTES = 4 * 1024 * 1024;

const day = (iso: string) => format(parseISO(iso), 'd MMM yyyy', { locale: fr });

/** « 412 jours importés, du 3 janv. 2024 au 30 sept. 2026 », plus the rows left out. */
export function mfpImportSummary(result: MfpImportResultPayload): string[] {
  const days =
    result.importedDays === 1 ? '1 jour importé' : `${result.importedDays} jours importés`;
  const span =
    result.firstDay && result.lastDay
      ? `, du ${day(result.firstDay)} au ${day(result.lastDay)}`
      : '';
  const skipped =
    result.skippedRows > 0
      ? [
          `${result.skippedRows} ligne${result.skippedRows > 1 ? 's' : ''} sans date ou sans calories ignorée${result.skippedRows > 1 ? 's' : ''}.`,
        ]
      : [];
  return [`${days}${span}.`, ...skipped];
}

/** A file refused before it is sent, or null when it can go. */
export function mfpImportFileProblem(file: { size: number }): string | null {
  return file.size > MFP_IMPORT_MAX_BYTES ? 'Fichier trop lourd (4 Mo maximum).' : null;
}
