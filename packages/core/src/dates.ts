/** YYYY-MM-DD of a UTC date, the form the CLI takes for --day. */
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);
