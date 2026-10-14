"use server";

import { Prisma, prisma } from "@recap/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/server/session";

const managerSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Name is required.").max(100),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});

export async function saveManagerAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = managerSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid manager." };

  const { id, name, email } = parsed.data;
  try {
    if (id) {
      const { count } = await prisma.manager.updateMany({ where: { id, userId: user.id }, data: { name, email } });
      if (count === 0) return { ok: false, error: "Manager not found." };
    } else {
      await prisma.manager.create({ data: { userId: user.id, name, email } });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `${email} is already in your list.` };
    }
    throw error;
  }

  revalidatePath("/managers");
  return { ok: true, message: id ? "Manager updated." : "Manager added." };
}

export async function deleteManagerAction(managerId: string): Promise<ActionResult> {
  const user = await requireUser();
  const id = z.string().min(1).parse(managerId);
  const { count } = await prisma.manager.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return { ok: false, error: "Manager not found." };

  revalidatePath("/managers");
  return { ok: true, message: "Manager removed." };
}
