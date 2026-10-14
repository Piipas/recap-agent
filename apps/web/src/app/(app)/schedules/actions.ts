"use server";

import { computeNextRunAt } from "@recap/core/schedules/next-run";
import { prisma } from "@recap/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { isSupportedLanguage } from "@/lib/recap-options";
import { isValidTimezone } from "@/lib/timezones";
import { requireUser } from "@/server/session";

const id = z.string().min(1);

const scheduleSchema = z
  .object({
    name: z.string().trim().min(1, "Give the schedule a name.").max(80),
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Pick at least one day.")
      .transform((days) => [...new Set(days)].sort()),
    timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid time."),
    timezone: z.string().refine(isValidTimezone, "Unknown timezone."),
    repoTypes: z.array(z.enum(["USER", "ORG"])).min(1, "Choose at least one repository scope."),
    language: z.string().refine(isSupportedLanguage, "Unsupported language."),
    mailboxId: z.string().min(1).nullable(),
    managerIds: z.array(z.string().min(1)),
    autoSend: z.boolean(),
    enabled: z.boolean(),
  })
  .refine((data) => !data.autoSend || (data.mailboxId !== null && data.managerIds.length > 0), {
    message: "Automatic sending needs a mailbox and at least one recipient.",
  });

export async function saveScheduleAction(
  scheduleId: string | null,
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = scheduleSchema.safeParse({
    name: formData.get("name"),
    daysOfWeek: formData.getAll("daysOfWeek"),
    timeOfDay: formData.get("timeOfDay"),
    timezone: formData.get("timezone"),
    repoTypes: formData.getAll("repoTypes"),
    language: formData.get("language"),
    mailboxId: formData.get("mailboxId") || null,
    managerIds: formData.getAll("managerIds"),
    autoSend: formData.get("autoSend") === "on",
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid schedule." };
  const { managerIds, mailboxId, ...fields } = parsed.data;

  const [mailbox, managerCount, existing] = await Promise.all([
    mailboxId ? prisma.mailbox.findFirst({ where: { id: mailboxId, userId: user.id }, select: { id: true } }) : null,
    prisma.manager.count({ where: { id: { in: managerIds }, userId: user.id } }),
    scheduleId ? prisma.schedule.findFirst({ where: { id: id.parse(scheduleId), userId: user.id } }) : null,
  ]);
  if (mailboxId && !mailbox) return { ok: false, error: "Mailbox not found." };
  if (managerCount !== managerIds.length) return { ok: false, error: "Recipient not found." };
  if (scheduleId && !existing) return { ok: false, error: "Schedule not found." };

  const data = {
    ...fields,
    mailboxId,
    nextRunAt: fields.enabled ? computeNextRunAt(fields, new Date()) : null,
  };
  const recipients = managerIds.map((managerId) => ({ id: managerId }));

  if (existing) {
    await prisma.schedule.update({ where: { id: existing.id }, data: { ...data, recipients: { set: recipients } } });
  } else {
    await prisma.schedule.create({ data: { ...data, userId: user.id, recipients: { connect: recipients } } });
  }

  revalidatePath("/schedules");
  redirect("/schedules");
}

export async function setScheduleEnabledAction(scheduleId: string, enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const schedule = await prisma.schedule.findFirst({ where: { id: id.parse(scheduleId), userId: user.id } });
  if (!schedule) return { ok: false, error: "Schedule not found." };

  await prisma.schedule.update({
    where: { id: schedule.id },
    data: { enabled, nextRunAt: enabled ? computeNextRunAt(schedule, new Date()) : null },
  });
  revalidatePath("/schedules");
  return { ok: true, message: enabled ? "Schedule resumed." : "Schedule paused." };
}

export async function deleteScheduleAction(scheduleId: string): Promise<ActionResult> {
  const user = await requireUser();
  const { count } = await prisma.schedule.deleteMany({ where: { id: id.parse(scheduleId), userId: user.id } });
  if (count === 0) return { ok: false, error: "Schedule not found." };

  revalidatePath("/schedules");
  return { ok: true, message: "Schedule deleted." };
}
