import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { type CliOutcome, parseCliOutput } from "./cli-output";

/** The CLI retries Groq errors forever, so every run is capped. */
const CLI_TIMEOUT_MS = 5 * 60_000;

export type CliRunInput = {
  githubToken: string;
  groqApiKey: string;
  /** YYYY-MM-DD */
  day: string;
  repoTypes: ("user" | "org")[];
  language: string;
};

export class CliRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliRunError";
  }
}

/** The workspace CLI's built entry point (its package `main`, dist/index.js). */
const cliEntry = createRequire(import.meta.url).resolve("recap-agent");

const run = (args: string[], env: NodeJS.ProcessEnv) =>
  new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    // The CLI retries Groq errors forever; never let it run unbounded.
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, CLI_TIMEOUT_MS);

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });

/**
 * Runs the unmodified recap-agent CLI in a child process. The CLI reads its GitHub
 * token from `<config dir>/recap-agent/credentials.json`, where the config dir is
 * %APPDATA% on Windows and $XDG_CONFIG_HOME elsewhere; both point at a throwaway
 * directory holding this user's token, so the interactive device flow never runs.
 */
export const runRecapCli = async ({ githubToken, groqApiKey, day, repoTypes, language }: CliRunInput) => {
  const home = await mkdtemp(path.join(os.tmpdir(), "recap-cli-"));
  const redact = (text: string) => text.replaceAll(githubToken, "[github-token]").replaceAll(groqApiKey, "[groq-key]");

  try {
    await mkdir(path.join(home, "recap-agent"), { mode: 0o700 });
    await writeFile(path.join(home, "recap-agent", "credentials.json"), JSON.stringify({ token: githubToken }), {
      mode: 0o600,
    });

    // A minimal environment: nothing from the worker (database URL, secrets) leaks in.
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
      APPDATA: home,
      XDG_CONFIG_HOME: home,
      HOME: home,
      TMPDIR: home,
      TEMP: home,
      TMP: home,
      NODE_ENV: "production",
    };

    const { code, stdout, stderr, timedOut } = await run(
      [
        cliEntry,
        "--repo-type",
        repoTypes.join(","),
        "--language",
        language,
        "--day",
        day,
        "--groq-api-key",
        groqApiKey,
      ],
      env,
    );

    if (timedOut) throw new CliRunError("Generation timed out. The AI service may be unavailable; try again later.");
    if (code !== 0) {
      // The CLI's top-level handler logs `Recap Agent failed: <error>` before exiting with 1.
      const lines = redact(stderr).split(/\r?\n/);
      const detail = lines.find((line) => line.startsWith("Recap Agent failed:")) ?? lines.at(-1) ?? "";
      throw new CliRunError(`Generation failed (exit code ${code}). ${detail}`.trim());
    }
    return parseCliOutput(stdout) satisfies CliOutcome;
  } finally {
    await rm(home, { recursive: true, force: true });
  }
};
