import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "test/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      // Database tests (*.db.test.ts) run only when TEST_DATABASE_URL points at a migrated database.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://test@localhost:5432/test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
      GITHUB_CLIENT_ID: "test",
      GITHUB_CLIENT_SECRET: "test",
      GOOGLE_CLIENT_ID: "test",
      GOOGLE_CLIENT_SECRET: "test",
      MICROSOFT_CLIENT_ID: "test",
      MICROSOFT_CLIENT_SECRET: "test",
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      RESEND_API_KEY: "test",
      EMAIL_FROM: "Recap Agent <test@example.com>",
      CRON_SECRET: "test-cron-secret-test-cron-secret",
      RECAP_AGENT_CLI: "../../packages/cli/dist/index.js",
    },
  },
});
