import { TZDate } from "@date-fns/tz";

export type ScheduleTiming = {
  /** 0 = Sunday … 6 = Saturday, in the schedule's timezone */
  daysOfWeek: number[];
  /** "HH:mm" wall-clock time in the schedule's timezone */
  timeOfDay: string;
  /** IANA timezone */
  timezone: string;
};

/**
 * The first slot strictly after `after`. Wall-clock times that don't exist (DST
 * spring-forward) move forward by the gap; times that happen twice (fall-back) run
 * once, at the second occurrence.
 */
export const computeNextRunAt = ({ daysOfWeek, timeOfDay, timezone }: ScheduleTiming, after: Date): Date | null => {
  if (daysOfWeek.length === 0) return null;
  const [hours = 0, minutes = 0] = timeOfDay.split(":").map(Number);
  const now = new TZDate(after.getTime(), timezone);

  for (let offset = 0; offset <= 7; offset++) {
    const [year, month, date] = [now.getFullYear(), now.getMonth(), now.getDate() + offset];
    // Weekday of the intended calendar day (noon is never affected by DST).
    const weekday = new TZDate(year, month, date, 12, 0, 0, 0, timezone).getDay();
    if (!daysOfWeek.includes(weekday)) continue;

    const slot = new TZDate(year, month, date, hours, minutes, 0, 0, timezone);
    if (slot.getTime() > after.getTime()) return new Date(slot.getTime());
  }
  return null;
};

/** The calendar day (YYYY-MM-DD) of an instant in a timezone; passed to the CLI as --day. */
export const localDay = (instant: Date, timezone: string) => {
  const local = new TZDate(instant.getTime(), timezone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
};
