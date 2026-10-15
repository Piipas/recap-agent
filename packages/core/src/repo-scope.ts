import { z } from "zod";

/** Which repositories a recap reads: personal ones, and chosen organizations (all or some of their repositories). */
export type RepoScope = { repoTypes: ("USER" | "ORG")[]; orgs: string[]; orgRepos: string[] };

const orgLogin = z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, "Invalid organization name.");
const repoFullName = z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]{1,100}$/, "Invalid repository name.");

/** Lower-cased owner of an "owner/repo" name (GitHub logins are case-insensitive). */
export const repoOwner = (fullName: string) => fullName.split("/", 1)[0]?.toLowerCase() ?? "";

/** The repositories picked for one organization; none means all of its repositories. */
export const reposOfOrg = (orgRepos: string[], org: string) =>
  orgRepos.filter((fullName) => repoOwner(fullName) === org.toLowerCase());

/**
 * Validates a repository selection and normalizes it: organizations only count with
 * ORG, and picked repositories only for a chosen organization.
 */
export const repoScopeSchema = z
  .object({
    repoTypes: z.array(z.enum(["USER", "ORG"])).min(1, "Choose at least one repository scope."),
    orgs: z.array(orgLogin).max(100, "Choose at most 100 organizations."),
    orgRepos: z.array(repoFullName).max(1000, "Choose at most 1,000 repositories."),
  })
  .refine((scope) => !scope.repoTypes.includes("ORG") || scope.orgs.length > 0, {
    message: "Choose at least one organization.",
    path: ["orgs"],
  })
  .transform(({ repoTypes, orgs, orgRepos }): RepoScope => {
    const withOrgs = repoTypes.includes("ORG");
    const chosen = withOrgs ? [...new Set(orgs)] : [];
    const owners = new Set(chosen.map((org) => org.toLowerCase()));
    return {
      repoTypes: [...new Set(repoTypes)],
      orgs: chosen,
      orgRepos: withOrgs ? [...new Set(orgRepos)].filter((fullName) => owners.has(repoOwner(fullName))) : [],
    };
  });
