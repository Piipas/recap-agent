import { type SendTrigger, prisma } from "@recap/db";
import { sendFromMailbox } from "../mailboxes/send";
import { recapEmailHtml } from "./render";

/** A lock older than this belongs to a process that died mid-send and can be retaken. */
const LOCK_STALE_MS = 10 * 60_000;

type SendOutcome = { ok: true; recipients: string[] } | { ok: false; error: string };

/**
 * Sends a recap the user has confirmed (or, for auto-send schedules, opted into).
 * Only a recap in PENDING_CONFIRMATION can be sent, and the conditional lock makes
 * a double click or concurrent request a no-op instead of a second email.
 */
export const sendRecap = async (recapId: string, userId: string, trigger: SendTrigger): Promise<SendOutcome> => {
  const { count } = await prisma.recap.updateMany({
    where: {
      id: recapId,
      userId,
      status: "PENDING_CONFIRMATION",
      OR: [{ sendLockedAt: null }, { sendLockedAt: { lt: new Date(Date.now() - LOCK_STALE_MS) } }],
    },
    data: { sendLockedAt: new Date() },
  });
  if (count === 0) return { ok: false, error: "This recap is not waiting for confirmation, or is already sending." };

  const recap = await prisma.recap.findUniqueOrThrow({ where: { id: recapId }, include: { mailbox: true } });
  const { mailbox, recipients } = recap;
  if (!mailbox || recipients.length === 0) {
    await prisma.recap.update({ where: { id: recap.id }, data: { status: "DRAFT", sendLockedAt: null } });
    return { ok: false, error: "Choose a mailbox and at least one recipient first." };
  }

  const log = { recapId: recap.id, mailboxId: mailbox.id, provider: mailbox.provider, fromEmail: mailbox.email, recipients, trigger };

  try {
    const { providerMessageId } = await sendFromMailbox(mailbox, {
      to: recipients,
      subject: recap.subject,
      text: recap.content,
      html: recapEmailHtml(recap.content),
    });
    await prisma.$transaction([
      prisma.recap.update({
        where: { id: recap.id },
        data: { status: "SENT", sentAt: new Date(), sendLockedAt: null },
      }),
      prisma.sendLog.create({ data: { ...log, status: "SENT", providerMessageId } }),
    ]);
    return { ok: true, recipients };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Sending failed.";
    await prisma.$transaction([
      prisma.recap.update({ where: { id: recap.id }, data: { status: "FAILED", sendLockedAt: null } }),
      prisma.sendLog.create({ data: { ...log, status: "FAILED", error: message } }),
    ]);
    return { ok: false, error: message };
  }
};
