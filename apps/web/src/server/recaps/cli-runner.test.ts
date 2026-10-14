import { describe, expect, it } from "vitest";
import { CliRunError, runRecapCli } from "./cli-runner";

// Runs the real, built CLI (turbo builds it before tests). With a bogus token the
// CLI must read our credentials file instead of starting its interactive device
// flow, fail on GitHub authentication, and the error must not leak the secrets.
describe("runRecapCli", () => {
  it("drives the CLI non-interactively and redacts secrets from failures", async () => {
    const githubToken = "gho_invalidtoken_for_tests";
    const groqApiKey = "gsk_invalidkey_for_tests";

    const error = await runRecapCli({
      githubToken,
      groqApiKey,
      day: "2026-10-12",
      repoTypes: ["user"],
      language: "en",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CliRunError);
    expect((error as Error).message).toMatch(/exit code 1/);
    expect((error as Error).message).not.toContain(githubToken);
    expect((error as Error).message).not.toContain(groqApiKey);
  }, 60_000);
});
