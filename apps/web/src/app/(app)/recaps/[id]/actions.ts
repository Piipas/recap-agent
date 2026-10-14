"use server";

import { prisma } from "@recap/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { sendRecap } from "@/server/recaps/send";
import { requireUser } from "@/server/session";

const id = z.string().min(1);

const prepareSchema = z.object({
  mailboxId: z.string().min(1, "Choose a mailbox to send from."),
  managerIds: z.array(z.string().min(1)).min(1, "Choose at least one recipient."),
});

/** Step 1: pick sender and recipients. The recap then waits for explicit confirmation. */
export async function prepareSendAction(
  recapId: string,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = prepareSchema.safeParse({
    mailboxId: formData.get("mailboxId"),
    managerIds: formData.getAll("managerIds"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid selection." };

  const [mailbox, managers] = await Promise.all([
    prisma.mailbox.findFirst({ where: { id: parsed.data.mailboxId, userId: user.id } }),
    prisma.manager.findMany({ where: { id: { in: parsed.data.managerIds }, userId: user.id } }),
  ]);
  if (!mailbox) return { ok: false, error: "Mailbox not found." };
  if (mailbox.status !== "ACTIVE") return { ok: false, error: "Reconnect this mailbox before sending from it." };
  if (managers.length !== parsed.data.managerIds.length) return { ok: false, error: "Recipient not found." };

  const { count } = await prisma.recap.updateMany({
    where: { id: id.parse(recapId), userId: user.id, status: { in: ["DRAFT", "FAILED"] } },
    data: { status: "PENDING_CONFIRMATION", mailboxId: mailbox.id, recipients: managers.map((manager) => manager.email) },
  });
  if (count === 0) return { ok: false, error: "This recap can no longer be changed." };

  revalidatePath(`/recaps/${recapId}`);
  return { ok: true };
}

/** Go back from the confirmation step to change sender or recipients. */
export async function editSendAction(recapId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await prisma.recap.updateMany({
    where: { id: id.parse(recapId), userId: user.id, status: "PENDING_CONFIRMATION", sendLockedAt: null },
    data: { status: "DRAFT" },
  });
  if (count === 0) return { ok: false, error: "This recap can no longer be changed." };

  revalidatePath(`/recaps/${recapId}`);
  return { ok: true };
}

/** Step 2: the explicit confirmation. Nothing is sent without it. */
export async function confirmSendAction(recapId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await sendRecap(id.parse(recapId), user.id, "MANUAL");

  revalidatePath(`/recaps/${recapId}`);
  revalidatePath("/recaps");
  return result.ok ? { ok: true, message: `Recap sent to ${result.recipients.join(", ")}.` } : result;
}
