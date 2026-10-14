import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

// Local development reads the repo-root .env files, like the web app. Real
// environment variables win, then .env.local, then .env. Deployed workers have no
// such files and use their environment as is.
const repoRoot = path.resolve(import.meta.dirname, "../../..");

for (const file of [".env.local", ".env"]) {
  const envPath = path.join(repoRoot, file);
  if (!fs.existsSync(envPath)) continue;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(envPath, "utf8")))) {
    process.env[key] ??= value;
  }
}
