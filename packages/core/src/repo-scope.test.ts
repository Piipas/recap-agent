import { describe, expect, it } from "vitest";
import { repoScopeSchema, reposOfOrg } from "./repo-scope";

describe("repoScopeSchema", () => {
  it("keeps organizations and their picked repositories", () => {
    expect(
      repoScopeSchema.parse({
        repoTypes: ["USER", "ORG"],
        orgs: ["acme", "Beta"],
        orgRepos: ["acme/api", "beta/web", "acme/api"],
      }),
    ).toEqual({ repoTypes: ["USER", "ORG"], orgs: ["acme", "Beta"], orgRepos: ["acme/api", "beta/web"] });
  });

  it("drops repositories of organizations that are not chosen", () => {
    expect(repoScopeSchema.parse({ repoTypes: ["ORG"], orgs: ["acme"], orgRepos: ["other/app"] }).orgRepos).toEqual([]);
  });

  it("ignores organizations without ORG", () => {
    expect(repoScopeSchema.parse({ repoTypes: ["USER"], orgs: ["acme"], orgRepos: ["acme/api"] })).toEqual({
      repoTypes: ["USER"],
      orgs: [],
      orgRepos: [],
    });
  });

  it("requires an organization with ORG", () => {
    const result = repoScopeSchema.safeParse({ repoTypes: ["ORG"], orgs: [], orgRepos: [] });
    expect(result.success ? null : result.error.issues[0]?.message).toBe("Choose at least one organization.");
  });

  it("rejects malformed names", () => {
    expect(repoScopeSchema.safeParse({ repoTypes: ["ORG"], orgs: ["../x"], orgRepos: [] }).success).toBe(false);
    expect(repoScopeSchema.safeParse({ repoTypes: ["ORG"], orgs: ["acme"], orgRepos: ["acme"] }).success).toBe(false);
  });
});

describe("reposOfOrg", () => {
  it("matches the owner case-insensitively", () => {
    expect(reposOfOrg(["Acme/api", "beta/web"], "acme")).toEqual(["Acme/api"]);
  });
});
