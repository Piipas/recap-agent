import type { DayCommit } from "./github";

/**
 * Upper bound for the commit list, in characters (about 4,000 tokens). Together with
 * the instructions and the answer, a request stays within Groq's free-tier limit of
 * 8,000 tokens per minute, whatever the number of commits.
 */
export const COMMITS_BUDGET_CHARS = 16_000;
const BODY_CHARS = 300;

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

const subject = (message: string) => message.split("\n", 1)[0]?.trim() ?? "";

const body = (message: string) => {
  const text = message.split("\n").slice(1).join(" ").replace(/\s+/g, " ").trim();
  return text.length > BODY_CHARS ? `${text.slice(0, BODY_CHARS)}…` : text;
};

const line = (commit: DayCommit, withBody: boolean) => {
  const head = `- [${commit.repo}] ${subject(commit.message)}`;
  const detail = withBody ? body(commit.message) : "";
  return detail ? `${head}\n  ${detail}` : head;
};

/**
 * One line per commit (repo and subject), with a shortened body when it fits.
 * Over budget, bodies are dropped first, then the newest commits are left out and
 * counted instead.
 */
export const formatCommits = (commits: DayCommit[], budget = COMMITS_BUDGET_CHARS) => {
  const withBodies = commits.map((commit) => line(commit, true)).join("\n");
  if (withBodies.length <= budget) return withBodies;

  const lines: string[] = [];
  let length = 0;
  for (const commit of commits) {
    const next = line(commit, false);
    if (length + next.length + 1 > budget) {
      lines.push(`- …and ${commits.length - lines.length} more commits not listed`);
      break;
    }
    lines.push(next);
    length += next.length + 1;
  }
  return lines.join("\n");
};

/** The report instructions, adapted from the CLI's prompt so both produce the same kind of report. */
export const buildPrompt = (commits: DayCommit[], languageCode: string, day: string) => {
  const language = displayNames.of(languageCode) ?? languageCode;
  const repos = new Set(commits.map(({ repo }) => repo)).size;

  return `You write daily work reports from GitHub commits.

COMMITS ON ${day} (${commits.length} ${commits.length === 1 ? "commit" : "commits"} in ${repos} ${repos === 1 ? "repository" : "repositories"}; [repo] subject, then the start of the body)
${formatCommits(commits)}

TASK
Turn the commits into a concise daily report a manager or teammate can read in under a minute.

LANGUAGE
Write the entire report in ${language}, including section headings. Keep code identifiers, repo names, file names, and technical terms (e.g. "refactor", "API") in their original form.

RULES
- Group related commits into themes (feature, bugfix, refactor, chore, docs, tests). Never list commits one by one.
- Describe outcomes, not mechanics. "Added password reset flow" beats "modified auth.service.ts".
- Use only what the commits show. Do not invent context, motives, or progress. If a message is vague (e.g. "fix", "wip"), group it under "Minor changes".
- Ignore noise: merge commits, version bumps, formatting-only, lockfile updates, unless they are the only work done.
- Mention the repo only if more than one repo has activity.
- Do not include SHAs, timestamps, or line counts.

OUTPUT FORMAT (Markdown)
## Daily Report: ${day}

**Summary**
2-3 sentences on the day's main focus.

**Done**
- Feature/fix/refactor group: one-line outcome

**In progress**
- Only if commits clearly indicate unfinished work (wip, partial, TODO). Otherwise omit this section.

**Notes**
- Only if something is risky or notable (large refactor, breaking change, migration). Otherwise omit.

(Translate the headings "Daily Report", "Summary", "Done", "In progress", "Notes" into ${language}.)

STYLE
Past tense, plain language, no filler, no emojis. Max 150 words total.`;
};
