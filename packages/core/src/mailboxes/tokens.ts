import { type Mailbox, prisma } from "@recap/db";
import { decryptSecret, encryptSecret } from "../crypto";
import { requestToken, slugForProvider, tokenErrorSchema, tokenResponseSchema } from "./providers";

/** The mailbox can no longer be used until the user reconnects it. */
export class MailboxReconnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailboxReconnectError";
  }
}

const EXPIRY_MARGIN_MS = 60_000;

export const markMailboxNeedsReconnect = async (mailboxId: string, reason: string) => {
  await prisma.mailbox.update({ where: { id: mailboxId }, data: { status: "NEEDS_RECONNECT", lastError: reason } });
  return new MailboxReconnectError(reason);
};

const refreshAccessToken = async (mailbox: Mailbox) => {
  const response = await requestToken(slugForProvider(mailbox.provider), {
    grant_type: "refresh_token",
    refresh_token: decryptSecret(mailbox.refreshTokenEnc),
  });

  if (!response.ok) {
    const error = tokenErrorSchema.safeParse(response.body);
    // invalid_grant: refresh token revoked, expired or the password changed.
    if (error.success && (error.data.error === "invalid_grant" || error.data.error === "unauthorized_client")) {
      throw await markMailboxNeedsReconnect(mailbox.id, "Access was revoked or expired. Reconnect this mailbox.");
    }
    throw new Error(`Token refresh failed (HTTP ${response.status})`);
  }

  const token = tokenResponseSchema.parse(response.body);
  await prisma.mailbox.update({
    where: { id: mailbox.id },
    data: {
      accessTokenEnc: encryptSecret(token.access_token),
      // Microsoft rotates refresh tokens; Google usually doesn't return a new one.
      ...(token.refresh_token ? { refreshTokenEnc: encryptSecret(token.refresh_token) } : {}),
      accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    },
  });
  return token.access_token;
};

export const getMailboxAccessToken = async (mailbox: Mailbox, { forceRefresh = false } = {}) => {
  if (mailbox.status !== "ACTIVE") throw new MailboxReconnectError(mailbox.lastError ?? "Reconnect this mailbox.");
  if (!forceRefresh && mailbox.accessTokenExpiresAt.getTime() - EXPIRY_MARGIN_MS > Date.now()) {
    return decryptSecret(mailbox.accessTokenEnc);
  }
  return refreshAccessToken(mailbox);
};
