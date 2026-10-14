"use client";

/** Formats a timestamp in the viewer's own timezone and locale. */
export function LocalTime({ date }: { date: string }) {
  return (
    <time dateTime={date} suppressHydrationWarning>
      {new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}
