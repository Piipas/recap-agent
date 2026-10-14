/**
 * The CLI has no programmatic API: it logs progress lines and then the report to
 * stdout. These are the exact strings it prints (packages/cli/index.ts).
 */
const REPORT_MARKER = /^Collected \d+ commits\. Generating report\.\.\.$/;
const NO_COMMITS = "No commits found for the specified date.";

export type CliOutcome = { kind: "report"; markdown: string } | { kind: "no-commits" };

export class CliOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliOutputError";
  }
}

export const parseCliOutput = (stdout: string): CliOutcome => {
  const lines = stdout.replace(/\r\n/g, "\n").split("\n");

  if (lines.some((line) => line.trim() === NO_COMMITS)) return { kind: "no-commits" };

  const markerIndex = lines.findIndex((line) => REPORT_MARKER.test(line.trim()));
  if (markerIndex === -1) throw new CliOutputError("The CLI finished without producing a report.");

  const markdown = lines
    .slice(markerIndex + 1)
    .join("\n")
    .trim();
  // The CLI prints `undefined` when the model response has an unexpected shape.
  if (!markdown || markdown === "undefined") throw new CliOutputError("The AI service returned an empty report.");

  return { kind: "report", markdown };
};
