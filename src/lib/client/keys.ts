export const queryKeys = {
  activities: ["activities"] as const,
  health: (days: number) => ["health", days] as const,
  goals: ["goals"] as const,
  plannedSessions: ["planned-sessions"] as const,
  activityStream: (id: string) => ["activity-stream", id] as const,
  physicalNotes: ["physical-notes"] as const,
  coachContext: ["coach-context"] as const,
  googleEvents: (from: string, to: string) =>
    ["google-events", from, to] as const,
  googleCalendars: ["google-calendars"] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  dailyBriefing: (date: string) => ["daily-briefing", date] as const,
  weeklyReview: (date: string) => ["weekly-review", date] as const,
  records: ["records"] as const,
};
