"use server";

import { prisma } from "@recap/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { disconnectGitHubSource } from "@/server/connections/github";
import { saveGroqKey } from "@/server/connections/groq";
import { requireUser } from "@/server/session";

export async function disconnectGitHubAction(): Promise<ActionResult> {
  const user = await requireUser();
  await disconnectGitHubSource(user.id);
  revalidatePath("/connections");
  return { ok: true, message: "GitHub disconnected." };
}

const groqKeySchema = z.object({
  apiKey: z.string().trim().min(20, "That does not look like a Groq API key.").max(200),
});

export async function saveGroqKeyAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = groqKeySchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid key." };

  const result = await saveGroqKey(user.id, parsed.data.apiKey);
  if (!result.ok) return result;

  revalidatePath("/connections");
  return { ok: true, message: "Groq API key saved." };
}

export async function removeGroqKeyAction(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.groqKey.deleteMany({ where: { userId: user.id } });
  revalidatePath("/connections");
  return { ok: true, message: "Groq API key removed." };
}
