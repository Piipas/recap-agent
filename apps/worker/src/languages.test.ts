import { languageCodes } from "@recap/core/languages";
import { languageCodes as cliLanguageCodes } from "recap-agent/dist/src/consts.js";
import { describe, expect, it } from "vitest";

describe("languageCodes", () => {
  it("matches the languages the CLI accepts", () => {
    expect(languageCodes).toEqual(cliLanguageCodes);
  });
});
