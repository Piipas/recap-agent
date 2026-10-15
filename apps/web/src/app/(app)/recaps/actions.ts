"use server";

import { deleteHistoryRun } from "@recap/core/recaps/history";
import { repoScopeSchema } from "@recap/core/repo-scope";
import { prisma } from "@recap/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { isSupportedLanguage } from "@/lib/recap-options";
import { requireUser } from "@/server/session";

const generateSchema = z.object({
  day: z.iso
    .date("Pick a valid date.")
    // Manual recaps cover a UTC day, so "today" is today in UTC.
    .refine((day) => Date.parse(day) <= Date.now(), "That day has not started yet (UTC)."),
  scope: repoScopeSchema,
  language: z.string().refine(isSupportedLanguage, "Unsupported language."),
});

export async function generateRecapAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = generateSchema.safeParse({
    day: formData.get("day"),
    scope: {
      repoTypes: formData.getAll("repoTypes"),
      orgs: formData.getAll("orgs"),
      orgRepos: formData.getAll("orgRepos"),
    },
    language: formData.get("language"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };

  const [github, groqKey] = await Promise.all([
    prisma.gitHubSource.findUnique({ where: { userId: user.id }, select: { status: true } }),
    prisma.groqKey.findUnique({ where: { userId: user.id }, select: { userId: true } }),
  ]);
  if (github?.status !== "ACTIVE") return { ok: false, error: "Connect GitHub in Connections first." };
  if (!groqKey) return { ok: false, error: "Add your Groq API key in Connections first." };

  // Queued only: the worker service claims the run and generates the recap.
  await prisma.recapRun.create({
    data: {
      userId: user.id,
      day: new Date(`${parsed.data.day}T00:00:00Z`),
      ...parsed.data.scope,
      language: parsed.data.language,
    },
  });

  revalidatePath("/recaps");
  return { ok: true, message: "Your recap is queued. It will appear below in a minute or two." };
}

export async function deleteRunAction(runId: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.string().min(1).safeParse(runId);
  if (!parsed.success || !(await deleteHistoryRun(parsed.data, user.id))) {
    return { ok: false, error: "This recap can't be deleted while it is being generated or sent." };
  }

  revalidatePath("/recaps");
  return { ok: true, message: "Deleted from history." };
}
