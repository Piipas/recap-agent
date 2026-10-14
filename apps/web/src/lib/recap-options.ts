import type { RepoType } from "@recap/db";
import { languageCodes } from "recap-agent/dist/src/consts.js";

// The CLI's own list, so the web app never offers a language the CLI would ignore.
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

/** The CLI's --repo-type values. */
export const toCliRepoType = (type: RepoType) => (type === "USER" ? "user" : "org");
