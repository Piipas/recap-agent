import "server-only";
import { z } from "zod";

const required = z.string().trim().min(1);

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: required,
  GITHUB_CLIENT_SECRET: required,
  GOOGLE_CLIENT_ID: required,
  GOOGLE_CLIENT_SECRET: required,
  MICROSOFT_CLIENT_ID: required,
  MICROSOFT_CLIENT_SECRET: required,
  TOKEN_ENCRYPTION_KEY: z
    .base64()
    .refine((value) => Buffer.from(value, "base64").length === 32, "must be 32 bytes, base64-encoded"),
});

export const env = schema.parse(process.env);
