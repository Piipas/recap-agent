import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { CommitsCollector } from "./src/helpers/commit-collector.js";
import { getGitHubToken, logoutGitHub } from "./src/lib/github-auth.js";
import { octokit, setOctokitToken } from "./src/lib/octokit.js";
import type { OwnedByType } from "./src/types.js";
import { aiService } from "./src/helpers/ai-service.js";
import { languageCodes } from "./src/consts.js";

const optionsSettings: ParseArgsOptionsConfig = {
  "repo-type": { type: "string", short: "t", default: "user" },
  logout: { type: "boolean", short: "o", default: false },
  language: { type: "string", short: "l", default: "en" },
  day: { type: "string", short: "d", default: new Date().toISOString().split("T")[0] },
};

const main = async () => {
  const { values: options } = parseArgs({ options: optionsSettings });

  // Handle logout option
  if (options.logout) {
    const removedCredentials = await logoutGitHub();
    console.log(removedCredentials ? "Saved GitHub credentials removed." : "No saved GitHub credentials found.");

    if (process.env.GITHUB_TOKEN)
      console.warn("GITHUB_TOKEN is still set and will continue to authenticate future runs.");

    return;
  }

  // Validate repo-type option
  const insertedRepoTypes = (options["repo-type"] as string).split(" ").map((v) => v.trim() as OwnedByType);

  if (!insertedRepoTypes.every((type) => type === "user" || type === "org"))
    throw new Error("Invalid repo type(s) provided. Valid types are 'user' and 'org'.");

  // Validate language option
  const language = languageCodes.includes(options.language as string) ? (options.language as string) : "en";

  // Validate day option
  const day = new Date(options.day as string);
  if (isNaN(day.getTime())) throw new Error("Invalid date format. Please use YYYY-MM-DD format.");

  console.log(`Collecting commits for ${day.toISOString().split("T")[0]}...`);

  // Set the date range for commit collection
  const since = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));

  console.log("Authenticating with GitHub...");

  const token = await getGitHubToken();
  setOctokitToken(token);

  const username = process.env.GITHUB_USERNAME || (await octokit.request("GET /user")).data.login;
  const orgs = process.env.GITHUB_ORGS ? process.env.GITHUB_ORGS.split(",") : [];

  console.log("Collecting commits from GitHub...");

  const commits = await CommitsCollector(username, insertedRepoTypes, orgs, since);

  if (commits.length) {
    console.log(`Collected ${commits.length} commits. Generating report...`);
    const report = await aiService(commits, language);

    console.log(report.output[1].content[0].text);
  } else {
    console.log("No commits found for the specified date.");
  }
};

main().catch((error: unknown) => {
  console.error("Recap Agent failed:", error);
  process.exitCode = 1;
});
