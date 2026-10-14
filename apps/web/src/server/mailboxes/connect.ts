import "server-only";
import { decryptSecret, encryptSecret } from "@recap/core/crypto";
import {
  type MailboxProviderSlug,
  mailboxProviders,
  requestToken,
  slugForProvider,
  tokenErrorSchema,
  tokenResponseSchema,
} from "@recap/core/mailboxes/providers";
import { prisma } from "@recap/db";
import { z } from "zod";
import { callbackUrl } from "@/server/connections/oauth-flow";
import { mailboxCallbackPath } from "./authorize";

// The ID token comes straight from the provider's token endpoint over TLS, so its
// claims can be read without signature verification (OIDC Core 3.1.3.7).
const idTokenClaims = z.object({
  sub: z.string(),
  oid: z.string().optional(),
  email: z.string().optional(),
  preferred_username: z.string().optional(),
});

const readIdToken = (idToken: string) => {
  const payload = idToken.split(".")[1];
  if (!payload) throw new Error("Malformed ID token");
  return idTokenClaims.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
};

export const connectMailbox = async (
  userId: string,
  slug: MailboxProviderSlug,
  code: string,
  codeVerifier: string,
) => {
  const config = mailboxProviders[slug];
  const response = await requestToken(slug, {
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl(mailboxCallbackPath(slug)),
    code_verifier: codeVerifier,
  });
  if (!response.ok) {
    const error = tokenErrorSchema.safeParse(response.body);
    throw new Error(error.success ? (error.data.error_description ?? error.data.error) : `HTTP ${response.status}`);
  }

  const token = tokenResponseSchema.parse(response.body);
  const grantedScope = token.scope ?? "";
  if (!grantedScope.toLowerCase().includes(config.sendScope.toLowerCase())) {
    throw new Error("Permission to send email was not granted.");
  }
  if (!token.refresh_token) throw new Error("The provider did not return a refresh token.");
  if (!token.id_token) throw new Error("The provider did not return an ID token.");

  const claims = readIdToken(token.id_token);
  const email = z.email().parse(claims.email ?? claims.preferred_username);
  const providerAccountId = claims.oid ?? claims.sub;

  const data = {
    email,
    accessTokenEnc: encryptSecret(token.access_token),
    refreshTokenEnc: encryptSecret(token.refresh_token),
    accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    scope: grantedScope,
    status: "ACTIVE" as const,
    lastError: null,
  };

  await prisma.mailbox.upsert({
    where: { userId_provider_providerAccountId: { userId, provider: config.provider, providerAccountId } },
    create: { userId, provider: config.provider, providerAccountId, ...data },
    update: data,
  });
};

export const disconnectMailbox = async (userId: string, mailboxId: string) => {
  const mailbox = await prisma.mailbox.findFirst({ where: { id: mailboxId, userId } });
  if (!mailbox) return false;

  // Google supports revoking a single grant. Microsoft has no per-token revocation
  // (only revoking every session of the user), so its tokens are just deleted; the
  // user can remove the app at https://myapps.microsoft.com.
  if (slugForProvider(mailbox.provider) === "google") {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: decryptSecret(mailbox.refreshTokenEnc) }),
    }).catch(() => undefined);
  }

  await prisma.mailbox.delete({ where: { id: mailbox.id } });
  return true;
};
