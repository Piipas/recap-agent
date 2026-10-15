import type { RepoType } from "@recap/db";
import { z } from "zod";

const API = "https://api.github.com";
const HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
const REQUEST_TIMEOUT_MS = 30_000;
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

const request = (token: string, url: string) =>
  fetch(url.startsWith("https://") ? url : `${API}${url}`, {
    headers: { ...HEADERS, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

const fail = async (response: Response, what: string) => {
  if (response.status === 401) return new Error("GitHub rejected the saved token. Reconnect GitHub in Connections.");
  if (response.status === 403 || response.status === 429) {
    return new Error("GitHub rate limit reached while reading commits. Try again later.");
  }
  return new Error(`GitHub returned HTTP ${response.status} while reading ${what}.`);
};

const nextPage = (response: Response) => /<([^>]+)>;\s*rel="next"/.exec(response.headers.get("link") ?? "")?.[1];

/** Pages of a GitHub list endpoint, following `Link: rel="next"`. */
async function* pages<T>(token: string, url: string, schema: z.ZodType<T>, what: string): AsyncGenerator<T[]> {
  for (let next: string | undefined = url; next; ) {
    const response = await request(token, next);
    // 409: the repository is empty.
    if (response.status === 409) return;
    if (!response.ok) throw await fail(response, what);
    yield z.array(schema).parse(await response.json());
    next = nextPage(response);
  }
}

/** Repositories the user can access with a push after `since`, newest push first. */
const recentRepos = async (token: string, since: Date, repoTypes: RepoType[]) => {
  const ownerTypes = new Set<string>(repoTypes.map((type) => (type === "USER" ? "User" : "Organization")));
  const repos: string[] = [];

  for await (const page of pages(
    token,
    "/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&direction=desc&per_page=100",
    repoSchema,
    "repositories",
  )) {
    for (const repo of page) {
      // Sorted by push date: once a repo was last pushed before the day, so were all the rest.
      if (!repo.pushed_at || new Date(repo.pushed_at) < since) return repos;
      if (ownerTypes.has(repo.owner.type)) repos.push(repo.full_name);
    }
  }
  return repos;
};

const repoCommits = async (token: string, repo: string, author: string, since: Date, until: Date) => {
  const params = new URLSearchParams({
    author,
    since: since.toISOString(),
    until: until.toISOString(),
    per_page: "100",
  });
  const commits: (z.infer<typeof commitSchema> & { repo: string })[] = [];
  for await (const page of pages(token, `/repos/${repo}/commits?${params}`, commitSchema, `commits of ${repo}`)) {
    commits.push(...page.map((commit) => ({ ...commit, repo })));
  }
  return commits;
};

/**
 * The user's commits on the default branch of each matching repository, between
 * `since` (inclusive) and `until` (exclusive), oldest first.
 */
export const collectCommits = async (
  token: string,
  { since, until, repoTypes }: { since: Date; until: Date; repoTypes: RepoType[] },
): Promise<DayCommit[]> => {
  const profile = await request(token, "/user");
  if (!profile.ok) throw await fail(profile, "the GitHub profile");
  const { login } = z.object({ login: z.string() }).parse(await profile.json());

  const repos = await recentRepos(token, since, repoTypes);
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
