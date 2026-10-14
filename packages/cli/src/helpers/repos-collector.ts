import { octokit } from "../lib/octokit.js";

export const getUserRepos = async (since: string, until: string) => {
  const repos = await octokit.request(`GET /user/repos`, {
    headers: {
      "X-GitHub-Api-Version": "2026-03-10",
    },
    since,
    until,
  });

  return repos.data;
};

export const getOrgRepos = async (org: string, since: string, until: string) => {
  const repos = await octokit.request(`GET /orgs/${org}/repos`, {
    org,
    headers: {
      "X-GitHub-Api-Version": "2026-03-10",
    },
    since,
    until,
  });

  return repos.data;
};
