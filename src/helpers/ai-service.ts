const getPrompt = (commits: any[], language: string = "en") => {
  return `You write daily work reports from GitHub commits.

INPUT
${JSON.stringify(commits)}

TASK
Turn the commits into a concise daily report a manager or teammate can read in under a minute.

LANGUAGE
Write the entire report in ${language}, including section headings and the "no activity" message. Keep code identifiers, repo names, file names, and technical terms (e.g. "refactor", "API") in their original form.

RULES
- Group related commits into themes (feature, bugfix, refactor, chore, docs, tests). Never list commits one by one.
- Describe outcomes, not mechanics. "Added password reset flow" beats "modified auth.service.ts".
- Use only what the commits show. Do not invent context, motives, or progress. If a message is vague (e.g. "fix", "wip"), infer cautiously from changed files, or group it under "Minor changes".
- Ignore noise: merge commits, version bumps, formatting-only, lockfile updates, unless they are the only work done.
- Mention the repo only if more than one repo has activity.
- Do not include SHAs, timestamps, or line counts unless asked.
- If there are no commits, output exactly "No activity today." translated into ${language}, and nothing else.

OUTPUT FORMAT (Markdown)
## Daily Report: {date}

**Summary**
2-3 sentences on the day's main focus.

**Done**
- Feature/fix/refactor group: one-line outcome

**In progress**
- Only if commits clearly indicate unfinished work (wip, partial, TODO). Otherwise omit this section.

**Notes**
- Only if something is risky or notable (large refactor, breaking change, migration). Otherwise omit.

(Translate the headings "Daily Report", "Summary", "Done", "In progress", "Notes" into {language}.)

STYLE
Past tense, plain language, no filler, no emojis. Max 150 words total.`;
};

export const aiService = async (commits: any[], language: string = "en") => {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        input: getPrompt(commits, language),
        metadata: {
          source: "recap-agent",
          version: "1.0.0",
        },
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling AI service:", error);
    throw error;
  }
};
