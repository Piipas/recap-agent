import { describe, expect, it } from "vitest";
import type { DayCommit } from "./github";
import { buildPrompt, formatCommits } from "./prompt";

const commit = (message: string, repo = "me/app"): DayCommit => ({ repo, date: "2026-10-14T10:00:00Z", message });

describe("formatCommits", () => {
  it("lists repo, subject and a shortened body", () => {
    const text = formatCommits([commit(`Add login\n\n${"detail ".repeat(100)}`)]);

    expect(text.startsWith("- [me/app] Add login\n  detail detail")).toBe(true);
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThan(400);
  });

  it("drops bodies, then leaves commits out, to stay within the budget", () => {
    const commits = Array.from({ length: 50 }, (_, index) => commit(`Change ${index}\n\n${"body ".repeat(50)}`));

    const text = formatCommits(commits, 400);

    expect(text.length).toBeLessThanOrEqual(400 + 50);
    expect(text).not.toContain("body");
    expect(text).toMatch(/- …and \d+ more commits not listed$/);
  });

  it("keeps a large day far below Groq's free-tier request size", () => {
    // The CLI sent raw GitHub commit objects: 18 commits were about 22,000 tokens.
    const commits = Array.from({ length: 500 }, (_, index) => commit(`Commit ${index}\n\n${"x".repeat(2000)}`));

    expect(buildPrompt(commits, "en", "2026-10-14").length / 4).toBeLessThan(5_000);
  });
});

describe("buildPrompt", () => {
  it("names the language and the day", () => {
    const prompt = buildPrompt([commit("Init")], "fr", "2026-10-14");

    expect(prompt).toContain("Write the entire report in French");
    expect(prompt).toContain("## Daily Report: 2026-10-14");
    expect(prompt).toContain("(1 commit in 1 repository;");
  });
});
