"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";
import { deleteAccount } from "@/server/account";
import { requireUser } from "@/server/session";

export async function deleteAccountAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const confirmation = z.string().trim().safeParse(formData.get("confirmEmail"));
  if (!confirmation.success || confirmation.data.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "Type your account email to confirm." };
  }

  // Signing out first ends the session and clears its cookie in this response.
  await auth.api.signOut({ headers: await headers() });
  await deleteAccount(user.id);
  redirect("/");
}
