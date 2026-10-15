import { afterEach, describe, expect, it, vi } from "vitest";
import { collectCommits } from "./github";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" }, ...init });

const repo = (full_name: string, ownerType: string, pushed_at: string | null) => ({
  full_name,
  owner: { type: ownerType },
  pushed_at,
});

const commit = (sha: string, message: string, date: string) => ({
  sha,
  commit: { message, author: { date }, committer: { date } },
});

const since = new Date("2026-10-14T00:00:00Z");
const until = new Date("2026-10-15T00:00:00Z");

/** Routes GitHub API paths to responses and records the URLs requested. */
const mockGitHub = (routes: Record<string, () => Response>) => {
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      requested.push(url);
      const path = url.replace("https://api.github.com", "");
      // The most specific (longest) matching prefix wins.
      const route = Object.entries(routes)
        .filter(([prefix]) => path.startsWith(prefix))
        .sort(([a], [b]) => b.length - a.length)[0];
      if (!route) throw new Error(`Unexpected request: ${path}`);
      return route[1]();
    }),
  );
  return requested;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("collectCommits", () => {
  it("reads personal repos pushed since the day and follows pagination", async () => {
    const requested = mockGitHub({
      "/user/repos?": () =>
        json([repo("me/app", "User", "2026-10-15T09:00:00Z"), repo("acme/fork", "Organization", "2026-10-14T18:00:00Z")], {
          headers: { link: '<https://api.github.com/user/repos?page=2>; rel="next"' },
        }),
      "/user/repos?page=2": () =>
        json([repo("me/docs", "User", "2026-10-14T08:00:00Z"), repo("me/old", "User", "2026-10-01T00:00:00Z")]),
      "/user": () => json({ login: "me" }),
      "/repos/me/app/commits": () =>
        json([commit("b", "Add login page\n\nWith a form.", "2026-10-14T15:00:00Z")], {
          headers: { link: '<https://api.github.com/repos/me/app/commits?page=2>; rel="next"' },
        }),
      "/repos/me/app/commits?page=2": () => json([commit("a", "Init", "2026-10-14T09:00:00Z")]),
      "/repos/me/docs/commits": () => new Response(null, { status: 409 }),
    });

    const commits = await collectCommits("token", { since, until, scope: { repoTypes: ["USER"], orgs: [], orgRepos: [] } });

    expect(commits).toEqual([
      { repo: "me/app", date: "2026-10-14T09:00:00Z", message: "Init" },
      { repo: "me/app", date: "2026-10-14T15:00:00Z", message: "Add login page\n\nWith a form." },
    ]);
    // An organization's repo is not personal, and "me/old" was pushed before the day.
    expect(requested.some((url) => url.includes("acme/fork") || url.includes("me/old"))).toBe(false);
    const commitsUrl = new URL(requested.find((url) => url.includes("/repos/me/app/commits?author")) ?? "");
    expect(Object.fromEntries(commitsUrl.searchParams)).toMatchObject({
      author: "me",
      since: "2026-10-14T00:00:00.000Z",
      until: "2026-10-15T00:00:00.000Z",
    });
  });

  it("reads all recent repos of a chosen organization, and only the picked ones of another", async () => {
    const requested = mockGitHub({
      "/user": () => json({ login: "me" }),
      "/orgs/acme/repos?": () =>
        json([repo("acme/api", "Organization", "2026-10-14T12:00:00Z"), repo("acme/legacy", "Organization", "2026-09-01T00:00:00Z")]),
      "/repos/acme/api/commits": () => json([commit("c", "Fix auth", "2026-10-14T11:00:00Z")]),
      "/repos/beta/web/commits": () => json([commit("d", "Add footer", "2026-10-14T10:00:00Z")]),
    });

    const commits = await collectCommits("token", {
      since,
      until,
      scope: { repoTypes: ["ORG"], orgs: ["acme", "beta"], orgRepos: ["beta/web"] },
    });

    expect(commits.map(({ repo }) => repo)).toEqual(["beta/web", "acme/api"]);
    // beta is limited to its picked repo, so its repository list is never read.
    expect(requested.some((url) => url.includes("/orgs/beta/repos") || url.includes("/user/repos"))).toBe(false);
  });

  it("explains an expired token", async () => {
    mockGitHub({ "/user": () => new Response(null, { status: 401 }) });

    await expect(
      collectCommits("token", { since, until, scope: { repoTypes: ["USER"], orgs: [], orgRepos: [] } }),
    ).rejects.toThrow("Reconnect GitHub");
  });
});
