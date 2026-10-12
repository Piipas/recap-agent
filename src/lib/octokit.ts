import { Octokit } from "octokit";

export let octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const setOctokitToken = (token: string) => {
  octokit = new Octokit({ auth: token });
};
