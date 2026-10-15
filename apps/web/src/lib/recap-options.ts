import { languageCodes } from "@recap/core/languages";
import { type RepoScope, reposOfOrg } from "@recap/core/repo-scope";
import type { RepoType } from "@recap/db";

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

export const languageOptions = languageCodes
  .map((code) => ({ code, label: displayNames.of(code) ?? code }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const isSupportedLanguage = (code: string) => languageCodes.includes(code);

export const languageLabel = (code: string) => displayNames.of(code) ?? code;

export const repoTypeOptions = [
  { value: "USER", label: "Personal repositories" },
  { value: "ORG", label: "Organization repositories" },
] as const satisfies readonly { value: RepoType; label: string }[];

/** "Personal, acme (all), beta (2 repositories)" */
export const describeRepoScope = ({ repoTypes, orgs, orgRepos }: RepoScope) => {
  const parts = repoTypes.includes("USER") ? ["Personal"] : [];
  if (repoTypes.includes("ORG")) {
    for (const org of orgs) {
      const picked = reposOfOrg(orgRepos, org).length;
      parts.push(`${org} (${picked === 0 ? "all" : `${picked} ${picked === 1 ? "repository" : "repositories"}`})`);
    }
  }
  return parts.join(", ");
};
