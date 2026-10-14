import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      // Database tests (*.db.test.ts) run only when TEST_DATABASE_URL points at a migrated database.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://test@localhost:5432/test",
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      GOOGLE_CLIENT_ID: "test",
      GOOGLE_CLIENT_SECRET: "test",
      MICROSOFT_CLIENT_ID: "test",
      MICROSOFT_CLIENT_SECRET: "test",
    },
  },
});
