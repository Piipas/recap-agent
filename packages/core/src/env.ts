import { z } from "zod";

const required = z.string().trim().min(1);

/** What the shared server code needs; each app validates its own variables on top. */
const schema = z.object({
  TOKEN_ENCRYPTION_KEY: z
    .base64()
    .refine((value) => Buffer.from(value, "base64").length === 32, "must be 32 bytes, base64-encoded"),
  GOOGLE_CLIENT_ID: required,
  GOOGLE_CLIENT_SECRET: required,
  MICROSOFT_CLIENT_ID: required,
  MICROSOFT_CLIENT_SECRET: required,
});

export const env = schema.parse(process.env);
