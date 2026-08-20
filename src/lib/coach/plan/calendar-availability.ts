import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getUpcomingBusy } from '@/lib/integrations/google/google-sync';

/**
 * Google busy slots, day by day, ready to drop into a coach prompt.
 *
 * Both `plan` and `chat` need this before they can propose a time. `plan` always
 * built it into the prompt; `chat` instead made the model call a tool for it,
 * which cost a full extra step — measured at 10s into a scheduling turn, with
 * the whole ~6000-token prefix resent afterwards. Same data, so same helper.
 *
 * Never throws: a calendar outage must degrade to "no agenda" rather than fail
 * the coach turn.
 */
export async function buildBusySummary(start: Date, days: number): Promise<string> {
  try {
    const busy = await getUpcomingBusy(days + 1);
    if (busy.length === 0) return '';

    const byDay = new Map<string, string[]>();
    for (const slot of busy) {
      const list = byDay.get(slot.dayKey) ?? [];
      list.push(`${slot.start}–${slot.end}`);
      byDay.set(slot.dayKey, list);
    }

    const lines: string[] = [];
    for (let i = 0; i <= days; i += 1) {
      const day = addDays(start, i);
      const slots = byDay.get(format(day, 'yyyy-MM-dd'));
      const label = `${format(day, 'EEE d MMM', { locale: fr })} (dayOffset ${i})`;
      lines.push(
        slots?.length
          ? `- ${label} : occupé ${slots.join(', ')}`
          : `- ${label} : libre toute la journée`,
      );
    }
    return lines.join('\n');
  } catch (error) {
    console.error('[coach] busy summary', error);
    return '';
  }
}
