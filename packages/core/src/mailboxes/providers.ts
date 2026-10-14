import type { MailboxProvider } from "@recap/db";
import { z } from "zod";
import { env } from "../env";

export const mailboxProviderSlugs = ["google", "microsoft"] as const;
export type MailboxProviderSlug = (typeof mailboxProviderSlugs)[number];

type ProviderConfig = {
  provider: MailboxProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  /** Identity scopes only identify the mailbox address; the send scope is the only data access. */
  scopes: string[];
  sendScope: string;
  authorizeParams: Record<string, string>;
  clientId: () => string;
  clientSecret: () => string;
};

export const mailboxProviders: Record<MailboxProviderSlug, ProviderConfig> = {
  google: {
    provider: "GOOGLE",
    label: "Gmail",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/gmail.send"],
    sendScope: "https://www.googleapis.com/auth/gmail.send",
    // offline + consent guarantees a refresh token; don't merge the sign-in grant's scopes.
    authorizeParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "false" },
    clientId: () => env.GOOGLE_CLIENT_ID,
    clientSecret: () => env.GOOGLE_CLIENT_SECRET,
  },
  microsoft: {
    provider: "MICROSOFT",
    label: "Outlook",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "offline_access", "https://graph.microsoft.com/Mail.Send"],
    sendScope: "Mail.Send",
    authorizeParams: { prompt: "select_account" },
    clientId: () => env.MICROSOFT_CLIENT_ID,
    clientSecret: () => env.MICROSOFT_CLIENT_SECRET,
  },
};

export const slugForProvider = (provider: MailboxProvider): MailboxProviderSlug =>
  provider === "GOOGLE" ? "google" : "microsoft";

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.coerce.number().positive(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
});

export const tokenErrorSchema = z.object({ error: z.string(), error_description: z.string().optional() });

/** Posts a form to the provider's token endpoint. */
export const requestToken = async (slug: MailboxProviderSlug, params: Record<string, string>) => {
  const config = mailboxProviders[slug];
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId(), client_secret: config.clientSecret(), ...params }),
  });
  const body: unknown = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, body };
};
