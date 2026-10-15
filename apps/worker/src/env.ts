import { z } from "zod";

const required = z.string().trim().min(1);

// Token encryption and mailbox OAuth variables are validated by @recap/core.
const schema = z.object({
  DATABASE_URL: z.url(),
  /** Public URL of the web app, for links in notification emails. */
  APP_URL: z.url(),
  RESEND_API_KEY: required,
  EMAIL_FROM: required,
  /** Recaps generated in parallel by this process. */
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
});

export const env = schema.parse(process.env);
