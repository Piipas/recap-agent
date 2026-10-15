import { dayBounds } from "@recap/core/dates";
import type { RepoScope } from "@recap/core/repo-scope";
import { collectCommits } from "./github";
import { generateReport } from "./groq";
import { buildPrompt } from "./prompt";

export type GenerationInput = {
  githubToken: string;
  groqApiKey: string;
  /** YYYY-MM-DD */
  day: string;
  /** IANA timezone the day is read in */
  timezone: string;
  scope: RepoScope;
  language: string;
};

export type GenerationOutcome = { kind: "report"; markdown: string } | { kind: "no-commits" };

/** Collects the day's commits from GitHub and has Groq write the recap. */
export const generateRecap = async (input: GenerationInput): Promise<GenerationOutcome> => {
  const { start, end } = dayBounds(input.day, input.timezone);
  const commits = await collectCommits(input.githubToken, { since: start, until: end, scope: input.scope });
  if (commits.length === 0) return { kind: "no-commits" };

  const markdown = await generateReport(input.groqApiKey, buildPrompt(commits, input.language, input.day));
  return { kind: "report", markdown };
};
