import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const webDir = import.meta.dirname;
const repoRoot = path.resolve(webDir, "../..");

// One .env at the repo root serves the web app and the Prisma CLI.
loadEnvConfig(repoRoot);

const findPackageDir = (name: string, fromDir: string): string => {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) return fs.realpathSync(candidate);
    if (path.dirname(dir) === dir) throw new Error(`Cannot resolve ${name} from ${fromDir}`);
  }
};

/**
 * The recap-agent CLI is spawned as a child process, so Next's file tracer never
 * sees it. Include its compiled output and its full production dependency tree in
 * the serverless bundles of the routes that generate recaps.
 */
const cliTraceGlobs = (): string[] => {
  const cliDir = findPackageDir("recap-agent", webDir);
  const toGlob = (dir: string, pattern: string) =>
    path.relative(webDir, path.join(dir, pattern)).split(path.sep).join("/");

  const globs = [toGlob(cliDir, "package.json"), toGlob(cliDir, "dist/**/*")];
  const seen = new Set<string>();
  const visit = (dir: string) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    for (const name of Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies })) {
      const depDir = findPackageDir(name, dir);
      if (seen.has(depDir)) continue;
      seen.add(depDir);
      globs.push(toGlob(depDir, "**/*"));
      visit(depDir);
    }
  };
  visit(cliDir);

  return globs;
};

const cliFiles = cliTraceGlobs();

const nextConfig: NextConfig = {
  transpilePackages: ["@recap/db"],
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/cron/tick": cliFiles,
    "/recaps": cliFiles,
  },
};

export default nextConfig;
