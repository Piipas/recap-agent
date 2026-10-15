import { TZDate } from "@date-fns/tz";

/** YYYY-MM-DD of a date stored as UTC midnight (the `day` columns). */
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The instants a calendar day (YYYY-MM-DD) starts and ends at, in a timezone. */
export const dayBounds = (day: string, timezone: string) => {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  return {
    start: new Date(new TZDate(year, month - 1, date, 0, 0, 0, 0, timezone).getTime()),
    end: new Date(new TZDate(year, month - 1, date + 1, 0, 0, 0, 0, timezone).getTime()),
  };
};
