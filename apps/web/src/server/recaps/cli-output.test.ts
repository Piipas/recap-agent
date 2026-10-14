import { describe, expect, it } from "vitest";
import { CliOutputError, parseCliOutput } from "./cli-output";

const preamble = [
  "Collecting commits for 2026-10-12...",
  "Authenticating with GitHub...",
  "Collecting commits from GitHub...",
];

describe("parseCliOutput", () => {
  it("extracts the report printed after the generation line", () => {
    const stdout = [
      ...preamble,
      "Collected 7 commits. Generating report...",
      "## Daily Report: 2026-10-12",
      "",
      "**Summary**",
      "Shipped the billing refresh.",
      "",
    ].join("\r\n");

    expect(parseCliOutput(stdout)).toEqual({
      kind: "report",
      markdown: "## Daily Report: 2026-10-12\n\n**Summary**\nShipped the billing refresh.",
    });
  });

  it("recognizes a day without commits", () => {
    const stdout = [...preamble, "No commits found for the specified date.", ""].join("\n");
    expect(parseCliOutput(stdout)).toEqual({ kind: "no-commits" });
  });

  it("rejects output without a report", () => {
    expect(() => parseCliOutput(preamble.join("\n"))).toThrow(CliOutputError);
  });

  it("rejects the literal `undefined` the CLI prints on an unexpected AI response", () => {
    const stdout = [...preamble, "Collected 2 commits. Generating report...", "undefined", ""].join("\n");
    expect(() => parseCliOutput(stdout)).toThrow("empty report");
  });
});
