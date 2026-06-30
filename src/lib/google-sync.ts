import type { PlannedSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createEvent,
  deleteEvent,
  getFreeBusy,
  listCalendars,
  listEvents,
  refreshAccessToken,
  updateEvent,
  type BusyInterval,
} from "@/lib/google";

const ACCOUNT_ID = "default";

// Fenêtre horaire par défaut pour caser une séance (heure locale).
const DAY_START_MIN = 6 * 60; // 06:00
const DAY_END_MIN = 21 * 60; // 21:00
const DEFAULT_DURATION_MIN = 60;
const SLOT_STEP_MIN = 15;

const TYPE_LABELS: Record<string, string> = {
  RUN: "Course",
  BIKE: "Vélo",
  SWIM: "Natation",
  STRENGTH: "Renfo",
};

export async function getGoogleAccount() {
  return prisma.googleAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

export async function disconnectGoogle() {
  await prisma.googleAccount.deleteMany({ where: { id: ACCOUNT_ID } });
  // On délie les séances : les events Google restent, mais l'app oublie le lien.
  await prisma.plannedSession.updateMany({
    where: { googleEventId: { not: null } },
    data: { googleEventId: null },
  });
}

export async function setTargetCalendar(
  calendarId: string | null,
  calendarName: string | null,
) {
  return prisma.googleAccount.update({
    where: { id: ACCOUNT_ID },
    data: { targetCalendarId: calendarId, targetCalendarName: calendarName },
  });
}

export async function setHiddenCalendars(ids: string[]) {
  const account = await getGoogleAccount();
  if (!account) {
    throw new Error("Compte Google non connecté");
  }
  return prisma.googleAccount.update({
    where: { id: ACCOUNT_ID },
    data: { hiddenCalendarIds: ids },
  });
}

export async function getValidAccessToken() {
  const account = await getGoogleAccount();
  if (!account) throw new Error("Compte Google non connecté");

  const expiresSoon = account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return account.accessToken;

  const refreshed = await refreshAccessToken(account.refreshToken);
  await prisma.googleAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      accessToken: refreshed.access_token,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      // Google ne renvoie pas toujours un nouveau refresh_token : on garde l'ancien.
      ...(refreshed.refresh_token
        ? { refreshToken: refreshed.refresh_token }
        : {}),
    },
  });
  return refreshed.access_token;
}

export async function listGoogleCalendars() {
  const token = await getValidAccessToken();
  return listCalendars(token);
}

// ---- Outils de date / fuseau ----

/** Clé jour "YYYY-MM-DD" à partir des composantes UTC de la date (stockée en @db.Date). */
function dayKeyFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Composantes (jour local + minutes) d'un instant dans un fuseau donné. */
function zonedDayAndMinutes(
  instant: Date,
  timeZone: string,
): { dayKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const dayKey = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dayKey, minutes };
}

function minutesToHHmm(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Cherche le premier créneau libre du jour (≥ durationMin), entre 06:00 et 21:00,
 * en évitant les intervalles occupés Google. Renvoie "HH:mm" ou null si rien.
 */
export function findFreeSlot(
  dayKey: string,
  durationMin: number,
  busy: BusyInterval[],
  timeZone: string,
): string | null {
  // Intervalles occupés (en minutes locales) sur ce jour précis.
  const intervals: Array<[number, number]> = [];
  for (const b of busy) {
    const start = zonedDayAndMinutes(new Date(b.start), timeZone);
    const end = zonedDayAndMinutes(new Date(b.end), timeZone);
    if (start.dayKey !== dayKey && end.dayKey !== dayKey) continue;
    const s = start.dayKey === dayKey ? start.minutes : 0;
    const e = end.dayKey === dayKey ? end.minutes : 24 * 60;
    intervals.push([s, e]);
  }
  intervals.sort((a, b) => a[0] - b[0]);

  const overlaps = (s: number, e: number) =>
    intervals.some(([bs, be]) => s < be && e > bs);

  for (
    let start = DAY_START_MIN;
    start + durationMin <= DAY_END_MIN;
    start += SLOT_STEP_MIN
  ) {
    if (!overlaps(start, start + durationMin)) {
      return minutesToHHmm(start);
    }
  }
  return null;
}

// ---- Synchro App → Google ----

interface PushResult {
  synced: boolean;
  reason?: string;
  eventId?: string;
  startTime?: string;
  htmlLink?: string;
}

/**
 * Crée (ou met à jour) l'événement Google correspondant à une séance planifiée
 * dans le calendrier cible. Choisit automatiquement un créneau libre si l'heure
 * n'est pas déjà fixée. Met à jour la séance en base (googleEventId, startTime).
 */
export async function pushSessionToGoogle(
  session: PlannedSession,
): Promise<PushResult> {
  const account = await getGoogleAccount();
  if (!account) return { synced: false, reason: "not_connected" };
  if (!account.targetCalendarId)
    return { synced: false, reason: "no_target_calendar" };

  const token = await getValidAccessToken();
  const timeZone = account.timeZone;
  const duration = session.durationMin ?? DEFAULT_DURATION_MIN;
  const dayKey = dayKeyFromDate(session.date);

  // Heure : déjà fixée, sinon premier créneau libre, sinon repli 07:00.
  let startTime = session.startTime ?? undefined;
  if (!startTime) {
    const start = new Date(`${dayKey}T00:00:00Z`);
    const end = new Date(`${dayKey}T23:59:59Z`);
    let calendarIds: string[] = [];
    try {
      const calendars = await listCalendars(token);
      calendarIds = calendars.map((c) => c.id);
    } catch {
      calendarIds = [account.targetCalendarId];
    }
    const busy = await getFreeBusy(token, start, end, calendarIds);
    startTime = findFreeSlot(dayKey, duration, busy, timeZone) ?? "07:00";
  }

  const startMin = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
  const endMin = startMin + duration;
  const summary = `[${TYPE_LABELS[session.type] ?? session.type}] ${session.title ?? "Séance"}`;
  const input = {
    summary,
    description: session.description,
    startDateTime: `${dayKey}T${minutesToHHmm(startMin)}:00`,
    endDateTime: `${dayKey}T${minutesToHHmm(Math.min(endMin, 24 * 60 - 1))}:00`,
    timeZone,
  };

  const event = session.googleEventId
    ? await updateEvent(token, account.targetCalendarId, session.googleEventId, input)
    : await createEvent(token, account.targetCalendarId, input);

  await prisma.plannedSession.update({
    where: { id: session.id },
    data: { googleEventId: event.id, startTime },
  });

  return {
    synced: true,
    eventId: event.id,
    startTime,
    htmlLink: event.htmlLink,
  };
}

/** Push Google en arrière-plan (ne bloque pas l'outil coach ni l'API). */
export function pushSessionToGoogleInBackground(session: PlannedSession): void {
  void pushSessionToGoogle(session).catch((error) => {
    console.error("Push Google Calendar échoué", error);
  });
}

export async function deleteSessionFromGoogle(
  session: Pick<PlannedSession, "googleEventId">,
): Promise<void> {
  if (!session.googleEventId) return;
  const account = await getGoogleAccount();
  if (!account?.targetCalendarId) return;
  const token = await getValidAccessToken();
  await deleteEvent(token, account.targetCalendarId, session.googleEventId);
}

// ---- Synchro Google → App (pull manuel) ----

export interface GooglePullResult {
  pushed: number;
  updated: number;
  unlinked: number;
}

/**
 * Synchronisation complète App ↔ Google :
 * 1. Pousse vers Google les séances futures pas encore liées (création des events).
 * 2. Récupère les modifications faites côté Google sur les séances liées :
 *    - événement déplacé → met à jour date + heure de la séance
 *    - événement supprimé → délie la séance (googleEventId = null)
 */
export async function syncFromGoogle(): Promise<GooglePullResult> {
  const account = await getGoogleAccount();
  if (!account?.targetCalendarId) {
    throw new Error("Aucun calendrier cible sélectionné");
  }
  const token = await getValidAccessToken();
  const timeZone = account.timeZone;

  const now = new Date();
  const from = new Date(now.getTime() - 7 * 86400_000);
  const to = new Date(now.getTime() + 90 * 86400_000);

  // ---- 1. Push des séances futures non encore synchronisées ----
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const unsynced = await prisma.plannedSession.findMany({
    where: { googleEventId: null, date: { gte: todayStart } },
  });
  let pushed = 0;
  for (const session of unsynced) {
    try {
      const result = await pushSessionToGoogle(session);
      if (result.synced) pushed += 1;
    } catch (error) {
      console.error("Push séance vers Google échoué", error);
    }
  }

  // ---- 2. Pull des modifications depuis Google ----
  const [events, sessions] = await Promise.all([
    listEvents(token, account.targetCalendarId, from, to),
    prisma.plannedSession.findMany({
      where: { googleEventId: { not: null } },
    }),
  ]);

  const eventById = new Map(events.map((e) => [e.id, e]));
  let updated = 0;
  let unlinked = 0;

  for (const session of sessions) {
    if (!session.googleEventId) continue;
    const event = eventById.get(session.googleEventId);

    if (!event || event.status === "cancelled") {
      await prisma.plannedSession.update({
        where: { id: session.id },
        data: { googleEventId: null },
      });
      unlinked += 1;
      continue;
    }

    const startIso = event.start?.dateTime ?? event.start?.date;
    if (!startIso) continue;
    const startInstant = new Date(startIso);
    const { dayKey, minutes } = zonedDayAndMinutes(startInstant, timeZone);
    const newDate = new Date(`${dayKey}T12:00:00Z`);
    const newStartTime = event.start?.dateTime ? minutesToHHmm(minutes) : null;

    const dateChanged =
      dayKeyFromDate(session.date) !== dayKey;
    const timeChanged = session.startTime !== newStartTime;

    if (dateChanged || timeChanged) {
      await prisma.plannedSession.update({
        where: { id: session.id },
        data: {
          ...(dateChanged ? { date: newDate } : {}),
          startTime: newStartTime,
        },
      });
      updated += 1;
    }
  }

  await prisma.googleAccount.update({
    where: { id: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return { pushed, updated, unlinked };
}

export interface CalendarEventView {
  id: string;
  calendarId: string;
  calendarName: string;
  color: string | null;
  summary: string;
  start: string; // ISO
  end: string; // ISO
  allDay: boolean;
}

/**
 * Récupère les événements de TOUS les calendriers Google (hors calendrier cible,
 * déjà représenté par les séances planifiées) sur une période, pour les afficher
 * dans la page Calendrier et visualiser les occupations perso.
 */
export async function getCalendarEvents(
  from: Date,
  to: Date,
): Promise<CalendarEventView[]> {
  const account = await getGoogleAccount();
  if (!account) return [];
  const token = await getValidAccessToken();
  const calendars = await listCalendars(token);

  const hidden = new Set(account.hiddenCalendarIds ?? []);
  const results: CalendarEventView[] = [];
  await Promise.all(
    calendars.map(async (cal) => {
      // Le calendrier cible (SPORT) est déjà affiché via les séances planifiées.
      if (cal.id === account.targetCalendarId) return;
      // Calendriers masqués par l'utilisateur.
      if (hidden.has(cal.id)) return;
      try {
        const events = await listEvents(token, cal.id, from, to);
        for (const e of events) {
          if (e.status === "cancelled") continue;
          const startIso = e.start?.dateTime ?? e.start?.date;
          const endIso = e.end?.dateTime ?? e.end?.date;
          if (!startIso) continue;
          results.push({
            id: e.id,
            calendarId: cal.id,
            calendarName: cal.summary,
            color: cal.backgroundColor ?? null,
            summary: e.summary ?? "(sans titre)",
            start: startIso,
            end: endIso ?? startIso,
            allDay: !e.start?.dateTime,
          });
        }
      } catch (error) {
        console.error(`Événements du calendrier ${cal.id} non récupérés`, error);
      }
    }),
  );
  return results;
}

/** Intervalles occupés à venir, résumés pour le contexte du coach. */
export async function getUpcomingBusy(days = 21): Promise<
  Array<{ dayKey: string; start: string; end: string }>
> {
  const account = await getGoogleAccount();
  if (!account) return [];
  const token = await getValidAccessToken();

  const now = new Date();
  const to = new Date(now.getTime() + days * 86400_000);
  let calendarIds: string[] = [];
  try {
    const calendars = await listCalendars(token);
    calendarIds = calendars.map((c) => c.id);
  } catch {
    return [];
  }
  const busy = await getFreeBusy(token, now, to, calendarIds);
  return busy.map((b) => {
    const s = zonedDayAndMinutes(new Date(b.start), account.timeZone);
    const e = zonedDayAndMinutes(new Date(b.end), account.timeZone);
    return {
      dayKey: s.dayKey,
      start: minutesToHHmm(s.minutes),
      end: e.dayKey === s.dayKey ? minutesToHHmm(e.minutes) : "24:00",
    };
  });
}
