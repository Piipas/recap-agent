import path from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

const root = path.resolve(import.meta.dirname, "../..");
// Same files, same precedence as the web app (`.env.local` wins over `.env`).
config({ path: [path.join(root, ".env.local"), path.join(root, ".env")], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
