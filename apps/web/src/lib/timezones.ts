export const timezoneOptions = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC")];

export const isValidTimezone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/** Monday-first, as most calendars outside North America display weeks. */
export const weekdayOptions = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
] as const;
