import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { CommitsCollector } from "./src/helpers/commit-collector.js";
import { getGitHubToken, logoutGitHub } from "./src/lib/github-auth.js";
import { octokit, setOctokitToken } from "./src/lib/octokit.js";
import type { OwnedByType } from "./src/types.js";

const optionsSettings: ParseArgsOptionsConfig = {
  "repo-type": { type: "string", short: "t", default: "user" },
  logout: { type: "boolean", short: "l", default: false },
};

const main = async () => {
  const { values: options } = parseArgs({ options: optionsSettings });

  if (options.logout) {
    const removedCredentials = await logoutGitHub();
    console.log(removedCredentials ? "Saved GitHub credentials removed." : "No saved GitHub credentials found.");

    if (process.env.GITHUB_TOKEN)
      console.warn("GITHUB_TOKEN is still set and will continue to authenticate future runs.");

    return;
  }

  const insertedRepoTypes = (options["repo-type"] as string).split(" ").map((v) => v.trim() as OwnedByType);

  if (!insertedRepoTypes.every((type) => type === "user" || type === "org"))
    throw new Error("Invalid repo type(s) provided. Valid types are 'user' and 'org'.");

  const token = await getGitHubToken();
  setOctokitToken(token);

  const username = process.env.GITHUB_USERNAME || (await octokit.request("GET /user")).data.login;
  const orgs = process.env.GITHUB_ORGS ? process.env.GITHUB_ORGS.split(",") : [];
  console.log("Recap Agent!");
  console.log("Collecting commits from GitHub...");

  const commits = await CommitsCollector(username, insertedRepoTypes, orgs);

  console.log(commits);
};

main().catch((error: unknown) => {
  console.error("Recap Agent failed:", error);
  process.exitCode = 1;
});
