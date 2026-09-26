let sessionNow: Date | null = null;

/** First paint after a Plan visit in this session — avoid a null-now empty rail. */
export function readPlanHubNow(): Date | null {
  return sessionNow;
}

export function rememberPlanHubNow(now: Date): Date {
  sessionNow = now;
  return now;
}

export function resetPlanHubNowForTests(): void {
  sessionNow = null;
}
