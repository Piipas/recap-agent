"use server";

import { prisma } from "@recap/db";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { isSupportedLanguage } from "@/lib/recap-options";
import { claimRun, processRun } from "@/server/recaps/runs";
import { requireUser } from "@/server/session";

const generateSchema = z.object({
  day: z.iso
    .date("Pick a valid date.")
    // The CLI collects a UTC day, so "today" is today in UTC.
    .refine((day) => Date.parse(day) <= Date.now(), "That day has not started yet (UTC)."),
  repoTypes: z.array(z.enum(["USER", "ORG"])).min(1, "Choose at least one repository scope."),
  language: z.string().refine(isSupportedLanguage, "Unsupported language."),
});

export async function generateRecapAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = generateSchema.safeParse({
    day: formData.get("day"),
    repoTypes: formData.getAll("repoTypes"),
    language: formData.get("language"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const [github, groqKey] = await Promise.all([
    prisma.gitHubSource.findUnique({ where: { userId: user.id }, select: { status: true } }),
    prisma.groqKey.findUnique({ where: { userId: user.id }, select: { userId: true } }),
  ]);
  if (github?.status !== "ACTIVE") return { ok: false, error: "Connect GitHub in Connections first." };
  if (!groqKey) return { ok: false, error: "Add your Groq API key in Connections first." };

  const run = await prisma.recapRun.create({
    data: {
      userId: user.id,
      day: new Date(`${parsed.data.day}T00:00:00Z`),
      repoTypes: parsed.data.repoTypes,
      language: parsed.data.language,
    },
  });

  // Generate right after responding; the cron tick picks the run up if this dies.
  after(async () => {
    if (await claimRun(run.id)) await processRun(run.id);
  });

  revalidatePath("/recaps");
  return { ok: true, message: "Generating your recap. It will appear below in a minute." };
}
