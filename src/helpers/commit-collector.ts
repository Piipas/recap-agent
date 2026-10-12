import { octokit } from "../lib/octokit.js";
import { getOrgRepos, getUserRepos } from "./repos-collector.js";

type OwnedByType = "user" | "org";

export const CommitsCollector = async (username: string, ownedBy: OwnedByType[] = ["user"], orgs: string[] = []) => {
  try {
    const now = new Date();

    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const until = new Date(since);
    until.setUTCDate(until.getUTCDate() + 1);

    const sinceISOString = since.toISOString().split(".")[0] + "Z";
    const untilISOString = until.toISOString().split(".")[0] + "Z";

    let repos: { data: any[] } = { data: [] };

    if (ownedBy.includes("user")) repos.data.push(await getUserRepos(sinceISOString, untilISOString));

    if (ownedBy.includes("org"))
      for (const org of orgs) repos.data.push(await getOrgRepos(org, sinceISOString, untilISOString));

    repos.data = repos.data.flat();

    const commits = await Promise.all(
      repos.data.map(async (repo) => {
        const commitsData = await octokit.request("GET /repos/{owner}/{repo}/commits", {
          owner: repo.owner.login,
          repo: repo.name,
          author: username,
          headers: {
            "X-GitHub-Api-Version": "2026-03-10",
          },
          since: sinceISOString,
          until: untilISOString,
        });

        return commitsData.data;
      }),
    );

    return commits.flat();
  } catch (error) {
    console.error("Error collecting commits:", error);
    throw error;
  }
};
