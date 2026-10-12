import { octokit } from "../lib/octokit.js";

export const CommitsCollector = async () => {
  const username = process.env.GITHUB_USERNAME;

  try {
    const now = new Date();

    const since = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const until = new Date(since);
    until.setUTCDate(until.getUTCDate() + 1);

    const sinceISOString = since.toISOString().split(".")[0] + "Z";
    const untilISOString = until.toISOString().split(".")[0] + "Z";

    const repos = await octokit.request(`GET /user/repos`, {
      headers: {
        "X-GitHub-Api-Version": "2026-03-10",
      },
      since: sinceISOString,
      until: untilISOString,
    });

    const commits = await Promise.all(
      repos.data.map(async (repo) => {
        const commitsData = await octokit.request(
          "GET /repos/{owner}/{repo}/commits",
          {
            owner: repo.owner.login,
            repo: repo.name,
            author: username,
            headers: {
              "X-GitHub-Api-Version": "2026-03-10",
            },
            since: sinceISOString,
            until: untilISOString,
          },
        );

        return commitsData.data;
      }),
    );

    return commits.flat();
  } catch (error) {
    console.error("Error collecting commits:", error);
    return [];
  }
};
