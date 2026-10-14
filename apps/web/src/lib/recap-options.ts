import { languageCodes } from "@recap/core/languages";
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
