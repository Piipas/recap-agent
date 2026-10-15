import { githubError, githubPages, githubRequest } from "@recap/core/github";
import { type RepoScope, reposOfOrg } from "@recap/core/repo-scope";
import { z } from "zod";

/** Repositories whose commits are fetched at the same time. */
const REPO_CONCURRENCY = 5;

export type DayCommit = { repo: string; date: string; message: string };

const repoSchema = z.object({
  full_name: z.string(),
  owner: z.object({ type: z.string() }),
  pushed_at: z.string().nullable(),
});

const commitSchema = z.object({
  sha: z.string(),
  commit: z.object({
    message: z.string(),
    author: z.object({ date: z.string() }).nullable(),
    committer: z.object({ date: z.string() }).nullable(),
  }),
});

/**
 * Names of the repositories in a list sorted by push date (newest first) that were
 * pushed after `since`. Paging stops at the first one last pushed before it.
 */
const pushedSince = async (
  token: string,
  url: string,
  since: Date,
  what: string,
  keep: (repo: z.infer<typeof repoSchema>) => boolean = () => true,
) => {
  const names: string[] = [];
  for await (const page of githubPages(token, url, repoSchema, what)) {
    for (const repo of page) {
      if (!repo.pushed_at || new Date(repo.pushed_at) < since) return names;
      if (keep(repo)) names.push(repo.full_name);
    }
  }
  return names;
};

/** The repositories a run reads: personal ones with a recent push, and the chosen organizations' ones. */
const reposToRead = async (token: string, since: Date, scope: RepoScope) => {
  const repos = new Set<string>();

  if (scope.repoTypes.includes("USER")) {
    const personal = await pushedSince(
      token,
      "/user/repos?affiliation=owner,collaborator&sort=pushed&direction=desc&per_page=100",
      since,
      "your repositories",
      (repo) => repo.owner.type === "User",
    );
    for (const name of personal) repos.add(name);
  }

  if (scope.repoTypes.includes("ORG")) {
    for (const org of scope.orgs) {
      const picked = reposOfOrg(scope.orgRepos, org);
      const names = picked.length
        ? picked
        : await pushedSince(
            token,
            `/orgs/${encodeURIComponent(org)}/repos?type=all&sort=pushed&direction=desc&per_page=100`,
            since,
            `the repositories of ${org}`,
          );
      for (const name of names) repos.add(name);
    }
  }
  return [...repos];
};

const repoCommits = async (token: string, repo: string, author: string, since: Date, until: Date) => {
  const params = new URLSearchParams({
    author,
    since: since.toISOString(),
    until: until.toISOString(),
    per_page: "100",
  });
  const commits: (z.infer<typeof commitSchema> & { repo: string })[] = [];
  for await (const page of githubPages(token, `/repos/${repo}/commits?${params}`, commitSchema, repo)) {
    commits.push(...page.map((commit) => ({ ...commit, repo })));
  }
  return commits;
};

/**
 * The user's commits on the default branch of each repository in scope, between
 * `since` (inclusive) and `until` (exclusive), oldest first.
 */
export const collectCommits = async (
  token: string,
  { since, until, scope }: { since: Date; until: Date; scope: RepoScope },
): Promise<DayCommit[]> => {
  const profile = await githubRequest(token, "/user");
  if (!profile.ok) throw githubError(profile, "your GitHub profile");
  const { login } = z.object({ login: z.string() }).parse(await profile.json());

  const repos = await reposToRead(token, since, scope);
  const found = [];
  for (let index = 0; index < repos.length; index += REPO_CONCURRENCY) {
    const batch = repos.slice(index, index + REPO_CONCURRENCY);
    found.push(...(await Promise.all(batch.map((repo) => repoCommits(token, repo, login, since, until)))).flat());
  }

  const seen = new Set<string>();
  return found
    .filter(({ sha }) => !seen.has(sha) && seen.add(sha))
    .map(({ repo, commit }) => ({
      repo,
      date: commit.committer?.date ?? commit.author?.date ?? since.toISOString(),
      message: commit.message.trim(),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};
