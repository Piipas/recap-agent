import "server-only";
import type { Mailbox } from "@recap/db";
import { z } from "zod";
import { type OutgoingEmail, buildMimeMessage } from "./mime";
import { getMailboxAccessToken, markMailboxNeedsReconnect } from "./tokens";

type Message = Omit<OutgoingEmail, "from">;

const sendViaGmail = async (accessToken: string, mailbox: Mailbox, message: Message) => {
  const raw = Buffer.from(buildMimeMessage({ ...message, from: mailbox.email })).toString("base64url");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  const messageId = response.ok ? z.object({ id: z.string() }).parse(await response.json()).id : null;
  return { response, messageId };
};

const sendViaGraph = async (accessToken: string, message: Message) => {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: "HTML", content: message.html },
        toRecipients: message.to.map((address) => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    }),
  });
  // Graph answers 202 Accepted with no message id.
  return { response, messageId: null };
};

const attempt = (accessToken: string, mailbox: Mailbox, message: Message) =>
  mailbox.provider === "GOOGLE" ? sendViaGmail(accessToken, mailbox, message) : sendViaGraph(accessToken, message);

/**
 * Sends as the mailbox owner through the provider's API (never SMTP). A 401 gets one
 * forced token refresh; a persistent 401/403 flags the mailbox for reconnect.
 */
export const sendFromMailbox = async (mailbox: Mailbox, message: Message) => {
  let result = await attempt(await getMailboxAccessToken(mailbox), mailbox, message);

  if (result.response.status === 401) {
    result = await attempt(await getMailboxAccessToken(mailbox, { forceRefresh: true }), mailbox, message);
  }
  if (result.response.status === 401 || result.response.status === 403) {
    throw await markMailboxNeedsReconnect(
      mailbox.id,
      "The provider refused to send from this mailbox. Reconnect it and approve sending.",
    );
  }
  if (!result.response.ok) {
    const detail = (await result.response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Send failed (HTTP ${result.response.status}) ${detail}`.trim());
  }

  return { providerMessageId: result.messageId };
};
