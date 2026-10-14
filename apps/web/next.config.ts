import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

const repoRoot = path.resolve(import.meta.dirname, "../..");

// One .env at the repo root serves the apps and the Prisma CLI. Real environment
// variables win, then .env.local, then .env (same precedence as Next's own loading).
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(repoRoot, file);
  if (!fs.existsSync(envPath)) continue;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(envPath, "utf8")))) {
    process.env[key] ??= value;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@recap/core", "@recap/db"],
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
