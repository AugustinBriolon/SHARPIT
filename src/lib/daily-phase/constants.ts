/** Minutes after last activity — accomplishment debrief before recovery window. */
export const ACCOMPLISHMENT_WINDOW_MINUTES = 60;

/** Minimum time in recovery window before end-of-day (without sleep signal). */
export const RECOVERY_TO_END_OF_DAY_MINUTES = 240;

/** Hours before planned start when pre-session phase activates. */
export const PRE_SESSION_WINDOW_HOURS = 3;

/** Rest day: snapshot age before evolving past morning without a session. */
export const REST_DAY_PREP_SNAPSHOT_AGE_MINUTES = 120;

/** Absolute fallback — only when athlete signals cannot disambiguate. */
export const END_OF_DAY_HOUR_FALLBACK = 22;

/** Secondary fallback when recovery window is long exhausted. */
export const LATE_DAY_HOUR_FALLBACK = 21;
