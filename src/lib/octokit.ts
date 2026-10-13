import { Octokit } from "octokit";

export let octokit = new Octokit({});

export const setOctokitToken = (token: string) => {
  octokit = new Octokit({ auth: token });
};
